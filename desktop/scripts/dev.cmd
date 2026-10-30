@echo off
rem Launch the Chuck Bot desktop shell for development.
rem
rem WorkBuddy / VSCode (and other Electron hosts) set ELECTRON_RUN_AS_NODE=1,
rem which makes `electron .` run as plain Node and turns require("electron")
rem into a path string (breaking app/BrowserWindow). Clear it before launch.
set ELECTRON_RUN_AS_NODE=
setlocal
.\node_modules\.bin\electron.cmd .
endlocal
