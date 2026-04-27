#Persistent
#SingleInstance Force

toggle := true
state := "idle"

SetTimer, MainLoop, 1000

MainLoop:
if (!toggle)
    return

; ===== IDLE PHASE (5 MIN) =====
if (state = "idle")
{
    Sleep, 300000  ; 5 minutes
    state := "scroll"
    startTime := A_TickCount
    return
}

; ===== SCROLL + MOUSE MOVE (3 MIN) =====
if (state = "scroll")
{
    elapsed := A_TickCount - startTime

    if (elapsed > 180000) ; 3 minutes
    {
        state := "idle"
        return
    }

    ; ---------- RANDOM SCROLL ----------
    Random, dir, 1, 2
    if (dir = 1)
        Send, {WheelUp}
    else
        Send, {WheelDown}

    ; ---------- RANDOM MOUSE MOVE ----------
    Random, mx, -40, 40
    Random, my, -40, 40
    MouseMove, mx, my, 10, R

    Sleep, 300
}

return

; ===== TOGGLE =====
F8::
toggle := !toggle
return

; ===== EXIT =====
F9::ExitApp