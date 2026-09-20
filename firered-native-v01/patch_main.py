#!/usr/bin/env python3
from pathlib import Path

path = Path("src/main.c")
text = path.read_text()

loop_start = """    int i=0;
    for (;;i++)
    {
"""
if loop_start not in text:
    raise SystemExit("FireRed main loop start not found")

text = text.replace(
    loop_start,
    """#if WASM
    return;
#else
    int i=0;
    for (;;i++)
    {
""",
    1,
)

loop_end = """        WaitForVBlank();
    }
}

static void UpdateLinkAndCallCallbacks(void)
"""
if loop_end not in text:
    raise SystemExit("FireRed main loop end not found")

wasm_frame = """        WaitForVBlank();
    }
#endif
}

#if WASM
void WasmRunFrame(void)
{
    ReadKeys();

    if (gSoftResetDisabled == FALSE
     && (gMain.heldKeysRaw & A_BUTTON)
     && (gMain.heldKeysRaw & B_START_SELECT) == B_START_SELECT)
    {
        rfu_REQ_stopMode();
#if REVISION < 0xA
        rfu_waitREQComplete();
#endif
        DoSoftReset();
    }

    if (Overworld_SendKeysToLinkIsRunning() == TRUE)
    {
        gLinkTransferringData = TRUE;
        UpdateLinkAndCallCallbacks();
        gLinkTransferringData = FALSE;
    }
    else
    {
        gLinkTransferringData = FALSE;
        UpdateLinkAndCallCallbacks();

        if (Overworld_RecvKeysFromLinkIsRunning() == 1)
        {
            gMain.newKeys = 0;
            ClearSpriteCopyRequests();
            gLinkTransferringData = TRUE;
            UpdateLinkAndCallCallbacks();
            gLinkTransferringData = FALSE;
        }
    }

    PlayTimeCounter_Update();
    MapMusicMain();
    VBlankIntr();
}
#endif

static void UpdateLinkAndCallCallbacks(void)
"""
text = text.replace(loop_end, wasm_frame, 1)
path.write_text(text)
