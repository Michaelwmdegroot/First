#include "global.h"
#include "platform.h"
#include "gba/defines.h"
#include "gba/flash_internal.h"
#include "platform/framedraw.h"

static u16 sWasmKeys;
static u16 sWasmFrameBuffer[DISPLAY_WIDTH * DISPLAY_HEIGHT];
static u32 sWasmSaveDirty;

void Platform_StoreSaveFile(void)
{
    sWasmSaveDirty = 1;
}

void Platform_ReadFlash(u16 sectorNum, u32 offset, u8 *dest, u32 size)
{
    u32 base = (sectorNum << gFlash->sector.shift) + offset;
    memcpy(dest, FLASH_BASE + base, size);
}

void Platform_QueueAudio(float *audioBuffer, s32 samplesPerFrame)
{
    (void)audioBuffer;
    (void)samplesPerFrame;
}

u16 Platform_GetKeyInput(void)
{
    return sWasmKeys;
}

/*
 * The browser owns frame pacing, so a blocking host-side VBlank wait would
 * deadlock the single-threaded WebAssembly instance. Main's WASM frame path
 * calls the game's VBlank interrupt once per exported frame instead.
 */
void VBlankIntrWait(void)
{
}

void WasmSetKeys(u32 keys)
{
    sWasmKeys = (u16)(keys & 0x03FF);
}

u16 *WasmFrameBuffer(void)
{
    return sWasmFrameBuffer;
}

u32 WasmFrameBufferSize(void)
{
    return sizeof(sWasmFrameBuffer);
}

void WasmRenderFrame(void)
{
    DrawFrame(sWasmFrameBuffer);
    REG_VCOUNT = 161;
}

u8 *WasmSaveBuffer(void)
{
    return FLASH_BASE;
}

u32 WasmSaveSize(void)
{
    return sizeof(FLASH_BASE);
}

void WasmClearSave(void)
{
    memset(FLASH_BASE, 0xFF, sizeof(FLASH_BASE));
    sWasmSaveDirty = 0;
}

u32 WasmTakeSaveDirty(void)
{
    u32 dirty = sWasmSaveDirty;
    sWasmSaveDirty = 0;
    return dirty;
}
