#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()

def patch_main() -> None:
    path = ROOT / "src/main.c"
    text = path.read_text()

    include = '#include "platform/dma.h"\n'
    if include not in text:
        anchor = '#include "platform.h"\n'
        if anchor in text:
            text = text.replace(anchor, anchor + include, 1)
        else:
            text = include + text

    signature = re.search(r"(?m)^void\\s+AgbMain\\s*\\([^)]*\\)\\s*$", text)
    if not signature:
        raise RuntimeError("Could not find AgbMain startup function")
    start = signature.start()
    open_brace = text.index("{", signature.end())
    depth = 0
    end = None
    for i in range(open_brace, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    if end is None:
        raise RuntimeError("Could not find AgbMain closing brace")

    body = text[open_brace + 1:end]
    loop_match = re.search(r"(?m)^(\s*)int\s+i\s*=\s*0\s*;\s*\n\s*for\s*\(\s*;;\s*i\+\+\s*\)\s*\{", body)
    if not loop_match:
        loop_match = re.search(r"(?m)^(\s*)for\s*\(\s*;;\s*\)\s*\{", body)
    if not loop_match:
        raise RuntimeError("Could not find AgbMain frame loop")

    loop_open = body.index("{", loop_match.start())
    depth = 0
    loop_end = None
    for i in range(loop_open, len(body)):
        if body[i] == "{":
            depth += 1
        elif body[i] == "}":
            depth -= 1
            if depth == 0:
                loop_end = i
                break
    if loop_end is None:
        raise RuntimeError("Could not find frame loop closing brace")

    frame_body = body[loop_open + 1:loop_end]
    frame_body = frame_body.replace(
        "WaitForVBlank();",
        """REG_DISPSTAT |= INTR_FLAG_VBLANK;
        RunDMAs(DMA_HBLANK);
        if (REG_DISPSTAT & DISPSTAT_VBLANK_INTR)
            gIntrTable[4]();
        REG_DISPSTAT &= ~INTR_FLAG_VBLANK;"""
    )

    init_body = body[:loop_match.start()].rstrip()
    native_loop = body[loop_match.start():loop_end + 1]

    new_body = (
        init_body
        + "\n\n#if WASM\n    return;\n#else\n"
        + native_loop
        + "\n#endif\n"
    )
    new_function = text[start:open_brace + 1] + new_body + "}"
    wasm_frame = """
\n#if WASM
void WasmRunFrame(void)
{
%s
}
#endif
""" % frame_body

    text = text[:start] + new_function + wasm_frame + text[end + 1:]
    path.write_text(text)


def patch_m4a() -> None:
    path = ROOT / "src/m4a.c"
    original = path.read_text()
    if original.startswith("#if WASM\n/* firered-native wasm audio stub */"):
        return

    stub = r'''#if WASM
/* firered-native wasm audio stub
 * V0.1 intentionally keeps timing/state calls non-blocking while the
 * browser-native video/input path is brought up. */
#include "global.h"
#include "m4a.h"

struct SoundInfo gSoundInfo = {0};
struct MusicPlayerInfo gMPlayInfo_BGM = {0};
struct MusicPlayerInfo gMPlayInfo_SE1 = {0};
struct MusicPlayerInfo gMPlayInfo_SE2 = {0};
struct MusicPlayerInfo gMPlayInfo_SE3 = {0};
struct PokemonCrySong gPokemonCrySong = {0};
struct PokemonCrySong gPokemonCrySongs[MAX_POKEMON_CRIES] = {0};
struct MusicPlayerInfo gPokemonCryMusicPlayers[MAX_POKEMON_CRIES] = {0};
struct MusicPlayerTrack gPokemonCryTracks[MAX_POKEMON_CRIES * 2] = {0};
u8 gMPlayMemAccArea[0x10] = {0};
MPlayFunc gMPlayJumpTable[36] = {0};
struct CgbChannel gCgbChans[4] = {0};
char SoundMainRAM[0x800] = {0};
const struct SongHeader mus_victory_gym_leader = {0};

static void WasmMPlayReady(struct MusicPlayerInfo *info)
{
    if (info)
    {
        info->ident = ID_NUMBER;
        info->status = 0;
    }
}

void m4aSoundVSync(void) {}
void m4aSoundVSyncOn(void) {}
void m4aSoundVSyncOff(void) {}
void m4aSoundInit(void)
{
    gSoundInfo.ident = ID_NUMBER;
    WasmMPlayReady(&gMPlayInfo_BGM);
    WasmMPlayReady(&gMPlayInfo_SE1);
    WasmMPlayReady(&gMPlayInfo_SE2);
    WasmMPlayReady(&gMPlayInfo_SE3);
}
void m4aSoundMain(void) {}
void m4aSoundMode(u32 mode) {(void)mode;}
void m4aSongNumStart(u16 n) {(void)n;}
void m4aSongNumStartOrChange(u16 n) {(void)n;}
void m4aSongNumStop(u16 n) {(void)n;}
void m4aMPlayAllStop(void)
{
    gMPlayInfo_BGM.status = 0;
    gMPlayInfo_SE1.status = 0;
    gMPlayInfo_SE2.status = 0;
    gMPlayInfo_SE3.status = 0;
}
void m4aMPlayContinue(struct MusicPlayerInfo *p) { WasmMPlayReady(p); }
void m4aMPlayFadeOut(struct MusicPlayerInfo *p, u16 speed) {(void)speed; WasmMPlayReady(p);}
void m4aMPlayFadeOutTemporarily(struct MusicPlayerInfo *p, u16 speed) {(void)speed; WasmMPlayReady(p);}
void m4aMPlayFadeIn(struct MusicPlayerInfo *p, u16 speed) {(void)speed; WasmMPlayReady(p);}
void m4aMPlayImmInit(struct MusicPlayerInfo *p) { WasmMPlayReady(p); }
void m4aMPlayStop(struct MusicPlayerInfo *p) { WasmMPlayReady(p); }
void m4aMPlayTempoControl(struct MusicPlayerInfo *p, u16 v) {(void)p;(void)v;}
void m4aMPlayVolumeControl(struct MusicPlayerInfo *p, u16 tracks, u16 volume) {(void)p;(void)tracks;(void)volume;}
void m4aMPlayPitchControl(struct MusicPlayerInfo *p, u16 tracks, s16 pitch) {(void)p;(void)tracks;(void)pitch;}
void m4aMPlayPanpotControl(struct MusicPlayerInfo *p, u16 tracks, s8 pan) {(void)p;(void)tracks;(void)pan;}
void m4aMPlayModDepthSet(struct MusicPlayerInfo *p, u16 tracks, u8 depth) {(void)p;(void)tracks;(void)depth;}
void m4aMPlayLFOSpeedSet(struct MusicPlayerInfo *p, u16 tracks, u8 speed) {(void)p;(void)tracks;(void)speed;}
struct MusicPlayerInfo *SetPokemonCryTone(struct ToneData *tone) {(void)tone; return &gPokemonCryMusicPlayers[0];}
void SetPokemonCryVolume(u8 v) {(void)v;}
void SetPokemonCryPanpot(s8 v) {(void)v;}
void SetPokemonCryPitch(s16 v) {(void)v;}
void SetPokemonCryLength(u16 v) {(void)v;}
void SetPokemonCryRelease(u8 v) {(void)v;}
void SetPokemonCryProgress(u32 v) {(void)v;}
bool32 IsPokemonCryPlaying(struct MusicPlayerInfo *p) {(void)p; return FALSE;}
void SetPokemonCryChorus(s8 v) {(void)v;}
void SetPokemonCryStereo(u32 v) {(void)v;}
void SetPokemonCryPriority(u8 v) {(void)v;}
#else
'''
    path.write_text(stub + original + "\n#endif /* WASM */\n")


def write_platform() -> None:
    path = ROOT / "src/platform/wasm.c"
    path.write_text(r'''#if WASM
#include "global.h"
#include "platform.h"
#include "gba/flash_internal.h"
#include "platform/framedraw.h"

#define WASM_WIDTH 240
#define WASM_HEIGHT 160

static u16 sWasmKeys;
static u16 sWasmBgr555[WASM_WIDTH * WASM_HEIGHT];
static u8 sWasmRgba[WASM_WIDTH * WASM_HEIGHT * 4];

void WasmSetKeys(u32 keys)
{
    sWasmKeys = (u16)(keys & KEYS_MASK);
}

u16 Platform_GetKeyInput(void)
{
    return sWasmKeys;
}

void Platform_QueueAudio(float *audioBuffer, s32 samplesPerFrame)
{
    (void)audioBuffer;
    (void)samplesPerFrame;
}

void Platform_StoreSaveFile(void)
{
    /* Browser persistence is performed by JavaScript from FLASH_BASE. */
}

void Platform_ReadFlash(u16 sectorNum, u32 offset, u8 *dest, u32 size)
{
    u32 base = ((u32)sectorNum << 12) + offset;
    if (base >= FLASH_ROM_SIZE_1M)
        return;
    if (size > FLASH_ROM_SIZE_1M - base)
        size = FLASH_ROM_SIZE_1M - base;
    memcpy(dest, &FLASH_BASE[base], size);
}

void VBlankIntrWait(void)
{
    /* Browser drives exactly one game frame per WasmRunFrame call. */
}

void WasmRenderFrame(void)
{
    u32 i;
    memset(sWasmBgr555, 0, sizeof(sWasmBgr555));
    DrawFrame(sWasmBgr555);
    for (i = 0; i < WASM_WIDTH * WASM_HEIGHT; i++)
    {
        u16 px = sWasmBgr555[i];
        sWasmRgba[i * 4 + 0] = (u8)(((px >> 0) & 0x1F) * 255 / 31);
        sWasmRgba[i * 4 + 1] = (u8)(((px >> 5) & 0x1F) * 255 / 31);
        sWasmRgba[i * 4 + 2] = (u8)(((px >> 10) & 0x1F) * 255 / 31);
        sWasmRgba[i * 4 + 3] = 255;
    }
    REG_VCOUNT = 161;
}

u8 *WasmDisplayBuffer(void)
{
    return sWasmRgba;
}

u32 WasmDisplayBufferSize(void)
{
    return sizeof(sWasmRgba);
}

u8 *WasmFlashBuffer(void)
{
    return FLASH_BASE;
}

u32 WasmFlashBufferSize(void)
{
    return FLASH_ROM_SIZE_1M;
}
#endif
''')


def write_libc() -> None:
    path = ROOT / "src/platform/wasm_libc.c"
    path.write_text(r'''#if WASM
#include <stddef.h>
#include <stdarg.h>

void *memcpy(void *dst, const void *src, size_t n)
{
    unsigned char *d = dst;
    const unsigned char *s = src;
    while (n--) *d++ = *s++;
    return dst;
}
void *memmove(void *dst, const void *src, size_t n)
{
    unsigned char *d = dst;
    const unsigned char *s = src;
    if (d < s)
        while (n--) *d++ = *s++;
    else
    {
        d += n; s += n;
        while (n--) *--d = *--s;
    }
    return dst;
}
void *memset(void *dst, int c, size_t n)
{
    unsigned char *d = dst;
    while (n--) *d++ = (unsigned char)c;
    return dst;
}
int memcmp(const void *a, const void *b, size_t n)
{
    const unsigned char *x = a, *y = b;
    while (n--)
    {
        if (*x != *y) return *x < *y ? -1 : 1;
        x++; y++;
    }
    return 0;
}
size_t strlen(const char *s)
{
    const char *p = s;
    while (*p) p++;
    return (size_t)(p - s);
}
int strcmp(const char *a, const char *b)
{
    while (*a && *a == *b) { a++; b++; }
    return (unsigned char)*a - (unsigned char)*b;
}
char *strcpy(char *dst, const char *src)
{
    char *out = dst;
    while ((*dst++ = *src++)) {}
    return out;
}
char *strncpy(char *dst, const char *src, size_t n)
{
    char *out = dst;
    while (n && *src) { *dst++ = *src++; n--; }
    while (n--) *dst++ = 0;
    return out;
}
char *strcat(char *dst, const char *src)
{
    char *out = dst;
    while (*dst) dst++;
    while ((*dst++ = *src++)) {}
    return out;
}
int abs(int x) { return x < 0 ? -x : x; }

/* Debug formatting is intentionally disabled in the browser build. */
int printf(const char *fmt, ...) {(void)fmt; return 0;}
int sprintf(char *str, const char *fmt, ...) {(void)fmt; if (str) *str = 0; return 0;}
int snprintf(char *str, unsigned long n, const char *fmt, ...) {(void)fmt; if (str && n) *str = 0; return 0;}
int vsprintf(char *str, const char *fmt, va_list ap) {(void)fmt;(void)ap; if (str) *str = 0; return 0;}
#endif
''')


def main() -> None:
    patch_main()
    patch_m4a()
    write_platform()
    write_libc()
    print("Prepared FireRed source for browser-native WASM build")

if __name__ == "__main__":
    main()
