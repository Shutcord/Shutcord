//go:build cli && windows

package main

import (
	"os"
	"path/filepath"
	"runtime"
	"unsafe"

	"github.com/jchv/go-webview2"
	"golang.org/x/sys/windows"
)

const (
	clientW = 760
	clientH = 520

	gwlStyle        = ^uintptr(15) // GWL_STYLE (-16)
	wsThickFrame    = 0x00040000
	wsMaximizeBox   = 0x00010000
	wsMinimizeBox   = 0x00020000
	swpNoZOrder     = 0x0004
	swpFrameChanged = 0x0020
	swpShowWindow   = 0x0040

	dwmaUseImmersiveDarkMode = 20
	dwmaWindowCornerPref     = 33
	dwmaBorderColor          = 34
	dwmaCaptionColor         = 35
	dwmaTextColor            = 36
)

var (
	user32 = windows.NewLazySystemDLL("user32.dll")
	dwmapi = windows.NewLazySystemDLL("dwmapi.dll")

	pSetProcessDPIAware = user32.NewProc("SetProcessDPIAware")
	pGetDpiForSystem    = user32.NewProc("GetDpiForSystem")
	pGetWindowLongPtr   = user32.NewProc("GetWindowLongPtrW")
	pSetWindowLongPtr   = user32.NewProc("SetWindowLongPtrW")
	pAdjustWindowRect   = user32.NewProc("AdjustWindowRect")
	pSetWindowPos       = user32.NewProc("SetWindowPos")
	pGetSystemMetrics   = user32.NewProc("GetSystemMetrics")
	pDwmSetAttr         = dwmapi.NewProc("DwmSetWindowAttribute")
)

type rect struct{ left, top, right, bottom int32 }

func dwmSet(hwnd uintptr, attr uintptr, v uint32) {
	_, _, _ = pDwmSetAttr.Call(hwnd, attr, uintptr(unsafe.Pointer(&v)), 4)
}

// colorref turns RGB into a Windows COLORREF (0x00BBGGRR)
func colorref(r, g, b uint32) uint32 { return b<<16 | g<<8 | r }

// runNativeWindow shows the installer in its own fixed-size window (WebView2).
// It blocks until the window is closed. Returns false if the window could not be created.
func runNativeWindow(url string) (ok bool) {
	defer func() {
		if r := recover(); r != nil {
			Log.Warn("Native window failed:", r)
			ok = false
		}
	}()
	runtime.LockOSThread()

	_, _, _ = pSetProcessDPIAware.Call()
	scale := 1.0
	if dpi, _, _ := pGetDpiForSystem.Call(); dpi != 0 {
		scale = float64(dpi) / 96.0
	}

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		DataPath: filepath.Join(os.TempDir(), "shutcord-installer-webview"),
		WindowOptions: webview2.WindowOptions{
			Title:  "Shutcord Installer",
			Width:  uint(clientW * scale),
			Height: uint(clientH * scale),
			IconId: 2, // group icon embedded by rsrc (id 1 is the manifest)
		},
	})
	if w == nil {
		return false
	}
	defer w.Destroy()

	hwnd := uintptr(w.Window())

	// fixed size: no resize border, no maximize, no minimize. Only the close button is left
	style, _, _ := pGetWindowLongPtr.Call(hwnd, gwlStyle)
	style &^= wsThickFrame | wsMaximizeBox | wsMinimizeBox
	_, _, _ = pSetWindowLongPtr.Call(hwnd, gwlStyle, style)

	// outer size that gives exactly the wanted client area, then center it
	r := rect{0, 0, int32(clientW * scale), int32(clientH * scale)}
	_, _, _ = pAdjustWindowRect.Call(uintptr(unsafe.Pointer(&r)), style, 0)
	ow, oh := int(r.right-r.left), int(r.bottom-r.top)
	sw, _, _ := pGetSystemMetrics.Call(0)
	sh, _, _ := pGetSystemMetrics.Call(1)
	_, _, _ = pSetWindowPos.Call(hwnd, 0, uintptr((int(sw)-ow)/2), uintptr((int(sh)-oh)/2), uintptr(ow), uintptr(oh),
		swpNoZOrder|swpFrameChanged|swpShowWindow)

	// dark title bar in the same grey as the page (Windows 10 1809+ dark mode, Windows 11 exact colors)
	dwmSet(hwnd, dwmaUseImmersiveDarkMode, 1)
	dwmSet(hwnd, dwmaCaptionColor, colorref(0x0f, 0x0f, 0x10))
	dwmSet(hwnd, dwmaTextColor, colorref(0xc8, 0xc8, 0xce))
	dwmSet(hwnd, dwmaBorderColor, colorref(0x26, 0x26, 0x2a))
	dwmSet(hwnd, dwmaWindowCornerPref, 2)

	w.Navigate(url)
	w.Run()
	return true
}
