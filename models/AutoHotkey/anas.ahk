#Requires AutoHotkey v2.0
#SingleInstance Force  ; Ek hi instance chalne dega, purana replace karega

isRunning := true

; 5 minutes = 300000 milliseconds
SetTimer(MoveSlightly, 300000)

F8:: {
    global isRunning
    isRunning := !isRunning
}

Esc:: {
    ExitApp()
}

MoveSlightly() {
    global isRunning
    if !isRunning
        return

    ; Mouse ko thora sa move karke wapas le aata hai
    MouseMove(8, 0, 2, "R")
    Sleep(200)
    MouseMove(-8, 0, 2, "R")
}