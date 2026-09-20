#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <SDL3/SDL.h>
#include <emscripten/emscripten.h>

#include "global.h"
#include "platform.h"
#include "gba/defines.h"
#include "gba/flash_internal.h"
#include "platform/dma.h"
#include "platform/framedraw.h"

extern IntrFunc gIntrTable[];
extern void AgbMain(void);

static SDL_Window *sWindow;
static SDL_Renderer *sRenderer;
static SDL_Texture *sTexture;

static u16 sKeyboardKeys;
static u16 sTouchKeys;

static u16 sFrame555[DISPLAY_WIDTH * DISPLAY_HEIGHT];
static u32 sFrame8888[DISPLAY_WIDTH * DISPLAY_HEIGHT];

static void ReadSaveFile(void)
{
    FILE *save;
    size_t read;

    memset(FLASH_BASE, 0xFF, FLASH_ROM_SIZE_1M);

    save = fopen("/save/pokefirered.sav", "rb");
    if (save == NULL)
        return;

    read = fread(FLASH_BASE, 1, FLASH_ROM_SIZE_1M, save);
    if (read < FLASH_ROM_SIZE_1M)
        memset(FLASH_BASE + read, 0xFF, FLASH_ROM_SIZE_1M - read);

    fclose(save);
}

static void WriteSaveFile(void)
{
    FILE *save = fopen("/save/pokefirered.sav", "wb");
    if (save == NULL)
        return;

    fwrite(FLASH_BASE, 1, FLASH_ROM_SIZE_1M, save);
    fclose(save);

    EM_ASM({
        if (typeof FS !== 'undefined') {
            FS.syncfs(false, function (err) {
                if (err) console.error("FireRed save sync failed", err);
            });
        }
    });
}

static u16 SdlKeyToGba(SDL_Keycode key)
{
    switch (key)
    {
    case SDLK_Z:         return A_BUTTON;
    case SDLK_X:         return B_BUTTON;
    case SDLK_RETURN:    return START_BUTTON;
    case SDLK_BACKSPACE: return SELECT_BUTTON;
    case SDLK_A:         return L_BUTTON;
    case SDLK_S:         return R_BUTTON;
    case SDLK_UP:        return DPAD_UP;
    case SDLK_DOWN:      return DPAD_DOWN;
    case SDLK_LEFT:      return DPAD_LEFT;
    case SDLK_RIGHT:     return DPAD_RIGHT;
    default:             return 0;
    }
}

static void ProcessEvents(void)
{
    SDL_Event event;

    while (SDL_PollEvent(&event))
    {
        u16 key;

        if (event.type == SDL_EVENT_KEY_DOWN)
        {
            key = SdlKeyToGba(event.key.key);
            sKeyboardKeys |= key;
        }
        else if (event.type == SDL_EVENT_KEY_UP)
        {
            key = SdlKeyToGba(event.key.key);
            sKeyboardKeys &= ~key;
        }
    }
}

static void RenderFrame(void)
{
    int i;

    memset(sFrame555, 0, sizeof(sFrame555));
    DrawFrame(sFrame555);

    for (i = 0; i < DISPLAY_WIDTH * DISPLAY_HEIGHT; i++)
    {
        const u16 px = sFrame555[i];
        const u32 r = (px & 0x001F) << 3;
        const u32 g = (px & 0x03E0) >> 2;
        const u32 b = (px & 0x7C00) >> 7;
        sFrame8888[i] = (r << 16) | (g << 8) | b;
    }

    SDL_UpdateTexture(sTexture, NULL, sFrame8888, DISPLAY_WIDTH * sizeof(u32));
    SDL_RenderClear(sRenderer);
    SDL_RenderTexture(sRenderer, sTexture, NULL, NULL);
    SDL_RenderPresent(sRenderer);

    REG_VCOUNT = 161;
}

EMSCRIPTEN_KEEPALIVE
void WebSetKeys(unsigned int mask)
{
    sTouchKeys = (u16)(mask & 0x03FF);
}

EMSCRIPTEN_KEEPALIVE
void WebFlushSave(void)
{
    WriteSaveFile();
}

EMSCRIPTEN_KEEPALIVE
void WebUnlockAudio(void)
{
    /* V0.1 boot proof is intentionally allowed to run silently.
     * This exported hook is kept stable so browser audio can be enabled
     * without changing the touch-control API later. */
}

u16 Platform_GetKeyInput(void)
{
    return sKeyboardKeys | sTouchKeys;
}

void Platform_StoreSaveFile(void)
{
    WriteSaveFile();
}

void Platform_ReadFlash(u16 sectorNum, u32 offset, u8 *dest, u32 size)
{
    u32 address = ((u32)sectorNum << gFlash->sector.shift) + offset;

    if (address >= FLASH_ROM_SIZE_1M)
        return;

    if (address + size > FLASH_ROM_SIZE_1M)
        size = FLASH_ROM_SIZE_1M - address;

    memcpy(dest, FLASH_BASE + address, size);
}

void Platform_QueueAudio(float *audioBuffer, s32 samplesPerFrame)
{
    (void)audioBuffer;
    (void)samplesPerFrame;
}

void VBlankIntrWait(void)
{
    ProcessEvents();
    RenderFrame();

    REG_DISPSTAT |= INTR_FLAG_VBLANK;
    RunDMAs(DMA_HBLANK);

    if (REG_DISPSTAT & DISPSTAT_VBLANK_INTR)
        gIntrTable[4]();

    REG_DISPSTAT &= ~INTR_FLAG_VBLANK;

    emscripten_sleep(16);
}

int main(void)
{
    ReadSaveFile();

    SDL_SetHint(SDL_HINT_EMSCRIPTEN_CANVAS_SELECTOR, "#screen");

    if (!SDL_Init(SDL_INIT_VIDEO | SDL_INIT_GAMEPAD))
    {
        fprintf(stderr, "SDL_Init failed: %s\n", SDL_GetError());
        return 1;
    }

    sWindow = SDL_CreateWindow("Personal FireRed", 960, 640, SDL_WINDOW_RESIZABLE);
    if (sWindow == NULL)
    {
        fprintf(stderr, "SDL_CreateWindow failed: %s\n", SDL_GetError());
        return 1;
    }

    sRenderer = SDL_CreateRenderer(sWindow, NULL);
    if (sRenderer == NULL)
    {
        fprintf(stderr, "SDL_CreateRenderer failed: %s\n", SDL_GetError());
        return 1;
    }

    SDL_SetRenderLogicalPresentation(
        sRenderer,
        DISPLAY_WIDTH,
        DISPLAY_HEIGHT,
        SDL_LOGICAL_PRESENTATION_LETTERBOX
    );

    sTexture = SDL_CreateTexture(
        sRenderer,
        SDL_PIXELFORMAT_XRGB8888,
        SDL_TEXTUREACCESS_STREAMING,
        DISPLAY_WIDTH,
        DISPLAY_HEIGHT
    );
    if (sTexture == NULL)
    {
        fprintf(stderr, "SDL_CreateTexture failed: %s\n", SDL_GetError());
        return 1;
    }

    SDL_SetTextureScaleMode(sTexture, SDL_SCALEMODE_NEAREST);
    SDL_SetRenderDrawColor(sRenderer, 0, 0, 0, 255);

    AgbMain();
    return 0;
}
