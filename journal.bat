@echo off
REM Dev Journal Helper Script for Windows
REM Usage: journal.bat [command] [args]

setlocal enabledelayedexpansion

set JOURNAL_DIR=dev-journal
set SESSIONS_DIR=%JOURNAL_DIR%\sessions
set DECISIONS_DIR=%JOURNAL_DIR%\decisions
set LEARNINGS_DIR=%JOURNAL_DIR%\learnings

REM Get today's date in YYYY-MM-DD format
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TODAY=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%

if "%1"=="" goto :help
if "%1"=="new" goto :new_session
if "%1"=="decision" goto :new_decision
if "%1"=="learning" goto :new_learning
if "%1"=="list" goto :list_sessions
if "%1"=="last" goto :open_last
if "%1"=="today" goto :open_today
if "%1"=="search" goto :search
if "%1"=="backup" goto :backup
goto :help

:new_session
if "%2"=="" (
    echo Error: Please provide a topic name
    echo Usage: journal.bat new [topic-name]
    exit /b 1
)
set FILENAME=%SESSIONS_DIR%\%TODAY%-%2.md
if exist "%FILENAME%" (
    echo Session file already exists: %FILENAME%
    echo Opening...
    start "" "%FILENAME%"
) else (
    echo Creating new session: %FILENAME%
    copy "%JOURNAL_DIR%\session-template.md" "%FILENAME%" >nul
    echo Created! Opening in editor...
    start "" "%FILENAME%"
)
exit /b 0

:new_decision
if "%2"=="" (
    echo Error: Please provide a decision topic
    echo Usage: journal.bat decision [topic-name]
    exit /b 1
)
REM Count existing decisions to get next number
set /a COUNT=1
for %%f in (%DECISIONS_DIR%\*.md) do set /a COUNT+=1
set "NUM=00!COUNT!"
set "NUM=!NUM:~-3!"
set FILENAME=%DECISIONS_DIR%\%TODAY%-DR-%NUM%-%2.md
echo Creating decision record: %FILENAME%
copy "%JOURNAL_DIR%\decision-template.md" "%FILENAME%" >nul
echo Created! Opening in editor...
start "" "%FILENAME%"
exit /b 0

:new_learning
if "%2"=="" (
    echo Error: Please provide a learning topic
    echo Usage: journal.bat learning [topic-name]
    exit /b 1
)
set FILENAME=%LEARNINGS_DIR%\%TODAY%-%2.md
echo Creating learning entry: %FILENAME%
(
echo # TIL: %2
echo.
echo **Date:** %TODAY%
echo **Tags:** #learning
echo.
echo ---
echo.
echo ## What I Learned
echo.
echo.
echo.
echo ## Context
echo.
echo.
echo.
echo ## Why It Matters
echo.
echo.
echo.
echo ## Code Example
echo.
echo ```typescript
echo // Example code here
echo ```
echo.
echo ## References
echo.
echo -
) > "%FILENAME%"
echo Created! Opening in editor...
start "" "%FILENAME%"
exit /b 0

:list_sessions
echo Recent journal sessions:
echo.
dir /b /o-d "%SESSIONS_DIR%\*.md" 2>nul | findstr /n "^"
if errorlevel 1 echo No sessions found
exit /b 0

:open_last
for /f "delims=" %%f in ('dir /b /o-d "%SESSIONS_DIR%\*.md" 2^>nul') do (
    set LAST_FILE=%%f
    goto :found_last
)
echo No sessions found
exit /b 1
:found_last
echo Opening: %LAST_FILE%
start "" "%SESSIONS_DIR%\%LAST_FILE%"
exit /b 0

:open_today
for %%f in (%SESSIONS_DIR%\%TODAY%-*.md) do (
    echo Opening: %%~nxf
    start "" "%%f"
    exit /b 0
)
echo No session found for today. Create one with: journal.bat new [topic]
exit /b 1

:search
if "%2"=="" (
    echo Error: Please provide a search term
    echo Usage: journal.bat search [term]
    exit /b 1
)
echo Searching for: %2
echo.
findstr /S /I /N /C:"%2" "%JOURNAL_DIR%\*.md" 2>nul
if errorlevel 1 echo No matches found
exit /b 0

:backup
set BACKUP_DIR=..\jouster-journal-backup-%TODAY%
echo Creating backup: %BACKUP_DIR%
xcopy /E /I /Y "%JOURNAL_DIR%" "%BACKUP_DIR%" >nul
if errorlevel 1 (
    echo Backup failed!
    exit /b 1
)
echo Backup complete: %BACKUP_DIR%
exit /b 0

:help
echo Dev Journal Helper - Commands:
echo.
echo   journal new [topic]        Create new session for today
echo   journal decision [topic]   Create new decision record
echo   journal learning [topic]   Create new TIL entry
echo   journal list               List recent sessions
echo   journal last               Open most recent session
echo   journal today              Open today's session
echo   journal search [term]      Search all journal entries
echo   journal backup             Backup journal to parent directory
echo.
echo Examples:
echo   journal new auth-refactor
echo   journal decision database-choice
echo   journal learning react-hooks
echo   journal search "authentication"
echo.
exit /b 0

