import sys
import ctypes
import ctypes.util
import json

x11 = ctypes.cdll.LoadLibrary(ctypes.util.find_library('X11'))

x11.XOpenDisplay.restype = ctypes.c_void_p
x11.XInternAtom.restype = ctypes.c_ulong
x11.XDefaultRootWindow.restype = ctypes.c_ulong
x11.XGetWindowProperty.restype = ctypes.c_int
x11.XFree.argtypes = [ctypes.c_void_p]

class XClientMessageEvent(ctypes.Structure):
    _fields_ = [
        ('type', ctypes.c_int),
        ('serial', ctypes.c_ulong),
        ('send_event', ctypes.c_int),
        ('display', ctypes.c_void_p),
        ('window', ctypes.c_ulong),
        ('message_type', ctypes.c_ulong),
        ('format', ctypes.c_int),
        ('data', ctypes.c_long * 5),
    ]

def activate_window(wid):
    display = x11.XOpenDisplay(None)
    if not display:
        return
    root = x11.XDefaultRootWindow(display)
    active_atom = x11.XInternAtom(display, b'_NET_ACTIVE_WINDOW', False)
    event = XClientMessageEvent()
    event.type = 33
    event.send_event = True
    event.display = display
    event.window = wid
    event.message_type = active_atom
    event.format = 32
    event.data[0] = 2
    event.data[1] = 0
    event.data[2] = 0
    x11.XSendEvent(display, root, False, 0x180000, ctypes.byref(event))
    x11.XMapRaised(display, wid)
    x11.XFlush(display)
    x11.XCloseDisplay(display)

def list_windows():
    display = x11.XOpenDisplay(None)
    if not display:
        print("[]")
        return
    root = x11.XDefaultRootWindow(display)
    client_list_atom = x11.XInternAtom(display, b'_NET_CLIENT_LIST', False)
    active_atom = x11.XInternAtom(display, b'_NET_ACTIVE_WINDOW', False)
    pid_atom = x11.XInternAtom(display, b'_NET_WM_PID', False)
    name_atom = x11.XInternAtom(display, b'_NET_WM_NAME', False)
    utf8_atom = x11.XInternAtom(display, b'UTF8_STRING', False)
    wm_class_atom = x11.XInternAtom(display, b'WM_CLASS', False)

    actual_type = ctypes.c_ulong()
    actual_format = ctypes.c_int()
    nitems = ctypes.c_ulong()
    bytes_after = ctypes.c_ulong()
    prop = ctypes.c_void_p()

    # Get active window
    active_wid = 0
    ret = x11.XGetWindowProperty(display, root, active_atom, 0, 1, False, 0,
        ctypes.byref(actual_type), ctypes.byref(actual_format),
        ctypes.byref(nitems), ctypes.byref(bytes_after), ctypes.byref(prop))
    if ret == 0 and nitems.value > 0 and prop.value:
        active_wid = ctypes.cast(prop, ctypes.POINTER(ctypes.c_ulong))[0]
        x11.XFree(prop)

    # Get client list
    ret = x11.XGetWindowProperty(display, root, client_list_atom, 0, 1024, False, 0,
        ctypes.byref(actual_type), ctypes.byref(actual_format),
        ctypes.byref(nitems), ctypes.byref(bytes_after), ctypes.byref(prop))

    windows = []
    if ret == 0 and nitems.value > 0 and prop.value:
        wids = ctypes.cast(prop, ctypes.POINTER(ctypes.c_ulong))
        for i in range(nitems.value):
            wid = wids[i]
            info = {"wid": int(wid), "pid": 0, "wmClass": "", "title": "", "isFocused": wid == active_wid}

            # Get PID
            p2 = ctypes.c_void_p()
            n2 = ctypes.c_ulong()
            r = x11.XGetWindowProperty(display, wid, pid_atom, 0, 1, False, 0,
                ctypes.byref(actual_type), ctypes.byref(actual_format),
                ctypes.byref(n2), ctypes.byref(bytes_after), ctypes.byref(p2))
            if r == 0 and n2.value > 0 and p2.value:
                info["pid"] = int(ctypes.cast(p2, ctypes.POINTER(ctypes.c_ulong))[0])
                x11.XFree(p2)

            # Get WM_CLASS
            p3 = ctypes.c_void_p()
            n3 = ctypes.c_ulong()
            r = x11.XGetWindowProperty(display, wid, wm_class_atom, 0, 1024, False, 0,
                ctypes.byref(actual_type), ctypes.byref(actual_format),
                ctypes.byref(n3), ctypes.byref(bytes_after), ctypes.byref(p3))
            if r == 0 and n3.value > 0 and p3.value:
                raw = ctypes.string_at(p3, n3.value)
                parts = raw.split(b'\x00')
                parts = [p.decode('utf-8', errors='replace') for p in parts if p]
                if len(parts) >= 2:
                    info["wmClass"] = parts[1]
                elif len(parts) == 1:
                    info["wmClass"] = parts[0]
                x11.XFree(p3)

            # Get _NET_WM_NAME
            p4 = ctypes.c_void_p()
            n4 = ctypes.c_ulong()
            r = x11.XGetWindowProperty(display, wid, name_atom, 0, 1024, False, utf8_atom,
                ctypes.byref(actual_type), ctypes.byref(actual_format),
                ctypes.byref(n4), ctypes.byref(bytes_after), ctypes.byref(p4))
            if r == 0 and n4.value > 0 and p4.value:
                info["title"] = ctypes.string_at(p4, n4.value).decode('utf-8', errors='replace')
                x11.XFree(p4)

            windows.append(info)
        x11.XFree(prop)

    x11.XCloseDisplay(display)
    print(json.dumps(windows))

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
    if cmd == "list":
        list_windows()
    elif cmd == "activate" and len(sys.argv) > 2:
        activate_window(int(sys.argv[2]))
    elif cmd == "super+a":
        display = x11.XOpenDisplay(None)
        if display:
            xtst = ctypes.cdll.LoadLibrary(ctypes.util.find_library('Xtst'))
            x11.XKeysymToKeycode.restype = ctypes.c_ubyte
            sk = x11.XKeysymToKeycode(display, 0xffeb)
            ak = x11.XKeysymToKeycode(display, 0x61)
            xtst.XTestFakeKeyEvent(display, sk, True, 0)
            xtst.XTestFakeKeyEvent(display, ak, True, 0)
            xtst.XTestFakeKeyEvent(display, ak, False, 0)
            xtst.XTestFakeKeyEvent(display, sk, False, 0)
            x11.XFlush(display)
            x11.XCloseDisplay(display)
