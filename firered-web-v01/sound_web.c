#include <string.h>

#include "global.h"
#include "m4a.h"
#include "sound.h"
#include "gba/m4a_internal.h"

ALIGNED(4) char SoundMainRAM_Buffer[0x800] = {0};
struct SoundInfo gSoundInfo = {0};
struct PokemonCrySong gPokemonCrySongs[MAX_POKEMON_CRIES] = {0};
struct MusicPlayerInfo gPokemonCryMusicPlayers[MAX_POKEMON_CRIES] = {0};
struct MusicPlayerTrack gPokemonCryTracks[MAX_POKEMON_CRIES * 2] = {0};
struct PokemonCrySong gPokemonCrySong = {0};
MPlayFunc gMPlayJumpTable[36] = {0};
struct CgbChannel gCgbChans[4] = {0};

struct MusicPlayerInfo gMPlayInfo_BGM = {0};
struct MusicPlayerInfo gMPlayInfo_SE1 = {0};
struct MusicPlayerInfo gMPlayInfo_SE2 = {0};
struct MusicPlayerInfo gMPlayInfo_SE3 = {0};

struct MusicPlayerTrack gMPlayTrack_BGM[10] = {0};
struct MusicPlayerTrack gMPlayTrack_SE1[3] = {0};
struct MusicPlayerTrack gMPlayTrack_SE2[9] = {0};
struct MusicPlayerTrack gMPlayTrack_SE3[1] = {0};

u8 gMPlayMemAccArea[0x10] = {0};

static u16 sCurrentMapMusic;
static u16 sFanfareFrames;
static u16 sSeFrames;
static u16 sCryFrames;
static bool8 sDisableMusic;

static void InitPlayer(struct MusicPlayerInfo *player)
{
    memset(player, 0, sizeof(*player));
    player->ident = ID_NUMBER;
}

static void StartPlayer(struct MusicPlayerInfo *player)
{
    if (player == NULL)
        return;
    player->ident = ID_NUMBER;
    player->status = MUSICPLAYER_STATUS_TRACK;
}

static void StopPlayer(struct MusicPlayerInfo *player)
{
    if (player == NULL)
        return;
    player->ident = ID_NUMBER;
    player->status = 0;
}

static void TickTransientAudio(void)
{
    if (sFanfareFrames)
        sFanfareFrames--;
    if (sSeFrames)
        sSeFrames--;
    if (sCryFrames)
        sCryFrames--;
}

void m4aSoundVSync(void) {}
void m4aSoundVSyncOn(void) {}
void m4aSoundVSyncOff(void) {}

void m4aSoundInit(void)
{
    memset(&gSoundInfo, 0, sizeof(gSoundInfo));
    gSoundInfo.ident = ID_NUMBER;

    InitPlayer(&gMPlayInfo_BGM);
    InitPlayer(&gMPlayInfo_SE1);
    InitPlayer(&gMPlayInfo_SE2);
    InitPlayer(&gMPlayInfo_SE3);
}

void m4aSoundMain(void)
{
    TickTransientAudio();
}

void m4aSoundMode(u32 mode) { (void)mode; }

void m4aSongNumStart(u16 n)
{
    (void)n;
}

void m4aSongNumStartOrChange(u16 n)
{
    m4aSongNumStart(n);
}

void m4aSongNumStartOrContinue(u16 n)
{
    m4aSongNumStart(n);
}

void m4aSongNumStop(u16 n)
{
    (void)n;
}

void m4aSongNumContinue(u16 n)
{
    (void)n;
}

void m4aMPlayAllStop(void)
{
    StopPlayer(&gMPlayInfo_BGM);
    StopPlayer(&gMPlayInfo_SE1);
    StopPlayer(&gMPlayInfo_SE2);
    StopPlayer(&gMPlayInfo_SE3);
}

void m4aMPlayAllContinue(void)
{
    if (sCurrentMapMusic)
        StartPlayer(&gMPlayInfo_BGM);
}

void m4aMPlayContinue(struct MusicPlayerInfo *mplayInfo)
{
    StartPlayer(mplayInfo);
}

void m4aMPlayStop(struct MusicPlayerInfo *mplayInfo)
{
    StopPlayer(mplayInfo);
}

void m4aMPlayFadeOut(struct MusicPlayerInfo *mplayInfo, u16 speed)
{
    (void)speed;
    StopPlayer(mplayInfo);
}

void m4aMPlayFadeOutTemporarily(struct MusicPlayerInfo *mplayInfo, u16 speed)
{
    (void)speed;
    if (mplayInfo != NULL)
        mplayInfo->status |= MUSICPLAYER_STATUS_PAUSE;
}

void m4aMPlayFadeIn(struct MusicPlayerInfo *mplayInfo, u16 speed)
{
    (void)speed;
    StartPlayer(mplayInfo);
}

void m4aMPlayImmInit(struct MusicPlayerInfo *mplayInfo)
{
    if (mplayInfo != NULL)
        mplayInfo->ident = ID_NUMBER;
}

void m4aMPlayTempoControl(struct MusicPlayerInfo *mplayInfo, u16 tempo)
{
    (void)mplayInfo;
    (void)tempo;
}

void m4aMPlayVolumeControl(struct MusicPlayerInfo *mplayInfo, u16 trackBits, u16 volume)
{
    (void)mplayInfo;
    (void)trackBits;
    (void)volume;
}

void m4aMPlayPitchControl(struct MusicPlayerInfo *mplayInfo, u16 trackBits, s16 pitch)
{
    (void)mplayInfo;
    (void)trackBits;
    (void)pitch;
}

void m4aMPlayPanpotControl(struct MusicPlayerInfo *mplayInfo, u16 trackBits, s8 pan)
{
    (void)mplayInfo;
    (void)trackBits;
    (void)pan;
}

void m4aMPlayModDepthSet(struct MusicPlayerInfo *mplayInfo, u16 trackBits, u8 modDepth)
{
    (void)mplayInfo;
    (void)trackBits;
    (void)modDepth;
}

void m4aMPlayLFOSpeedSet(struct MusicPlayerInfo *mplayInfo, u16 trackBits, u8 lfoSpeed)
{
    (void)mplayInfo;
    (void)trackBits;
    (void)lfoSpeed;
}

void MPlayContinue(struct MusicPlayerInfo *mplayInfo) { m4aMPlayContinue(mplayInfo); }
void MPlayFadeOut(struct MusicPlayerInfo *mplayInfo, u16 speed) { m4aMPlayFadeOut(mplayInfo, speed); }
void MPlayStart(struct MusicPlayerInfo *mplayInfo, struct SongHeader *songHeader)
{
    (void)songHeader;
    StartPlayer(mplayInfo);
}
void MPlayMain(struct MusicPlayerInfo *mplayInfo) { (void)mplayInfo; }
void MPlayOpen(struct MusicPlayerInfo *mplayInfo, struct MusicPlayerTrack *tracks, u8 trackCount)
{
    InitPlayer(mplayInfo);
    if (mplayInfo != NULL)
    {
        mplayInfo->tracks = tracks;
        mplayInfo->trackCount = trackCount;
    }
}
void MPlayExtender(struct CgbChannel *cgbChans) { (void)cgbChans; }
void SoundInit(struct SoundInfo *soundInfo)
{
    if (soundInfo != NULL)
    {
        memset(soundInfo, 0, sizeof(*soundInfo));
        soundInfo->ident = ID_NUMBER;
    }
}
void FadeOutBody(struct MusicPlayerInfo *mplayInfo) { StopPlayer(mplayInfo); }
void TrkVolPitSet(struct MusicPlayerInfo *mplayInfo, struct MusicPlayerTrack *track)
{
    (void)mplayInfo;
    (void)track;
}
void ClearChain(void *x) { (void)x; }
void RealClearChain(void *x) { (void)x; }
void Clear64byte(void *addr) { if (addr) memset(addr, 0, 64); }
void CgbSound(void) {}
void CgbOscOff(u8 x) { (void)x; }
void CgbModVol(struct CgbChannel *chan) { (void)chan; }
u32 MidiKeyToCgbFreq(u8 a, u8 b, u8 c) { (void)a; (void)b; (void)c; return 0; }
u32 MidiKeyToFreq(struct WaveData *wav, u8 key, u8 fineAdjust)
{
    (void)wav;
    (void)key;
    (void)fineAdjust;
    return 0;
}
void DummyFunc(void) {}
void SampleFreqSet(u32 freq) { (void)freq; }
void InitMapMusic(void)
{
    sCurrentMapMusic = 0;
    sFanfareFrames = 0;
    sSeFrames = 0;
    sCryFrames = 0;
    sDisableMusic = FALSE;
    StopPlayer(&gMPlayInfo_BGM);
}

void MapMusicMain(void)
{
    /* m4aSoundMain is called during VBlank; keep this function lightweight. */
}

void ResetMapMusic(void)
{
    sCurrentMapMusic = 0;
    StopPlayer(&gMPlayInfo_BGM);
}

u16 GetCurrentMapMusic(void) { return sCurrentMapMusic; }

void PlayNewMapMusic(u16 songNum)
{
    PlayBGM(songNum);
}

void StopMapMusic(void)
{
    sCurrentMapMusic = 0;
    StopPlayer(&gMPlayInfo_BGM);
}

void FadeOutMapMusic(u8 speed)
{
    (void)speed;
    StopMapMusic();
}

void FadeOutAndPlayNewMapMusic(u16 songNum, u8 speed)
{
    (void)speed;
    PlayBGM(songNum);
}

void FadeOutAndFadeInNewMapMusic(u16 songNum, u8 fadeOutSpeed, u8 fadeInSpeed)
{
    (void)fadeOutSpeed;
    (void)fadeInSpeed;
    PlayBGM(songNum);
}

bool8 IsNotWaitingForBGMStop(void) { return TRUE; }

void PlayFanfareByFanfareNum(u8 fanfareNum)
{
    (void)fanfareNum;
    sFanfareFrames = 60;
}

bool8 WaitFanfare(bool8 stop)
{
    (void)stop;
    return sFanfareFrames == 0;
}

void StopFanfareByFanfareNum(u8 fanfareNum)
{
    (void)fanfareNum;
    sFanfareFrames = 0;
}

void PlayFanfare(u16 songNum)
{
    (void)songNum;
    sFanfareFrames = 60;
}

bool8 IsFanfareTaskInactive(void) { return sFanfareFrames == 0; }

void FadeInNewBGM(u16 songNum, u8 speed)
{
    (void)speed;
    PlayBGM(songNum);
}

void FadeOutBGMTemporarily(u8 speed)
{
    (void)speed;
    gMPlayInfo_BGM.status |= MUSICPLAYER_STATUS_PAUSE;
}

bool8 IsBGMPausedOrStopped(void)
{
    return !(gMPlayInfo_BGM.status & MUSICPLAYER_STATUS_TRACK)
        || (gMPlayInfo_BGM.status & MUSICPLAYER_STATUS_PAUSE);
}

void FadeInBGM(u8 speed)
{
    (void)speed;
    if (sCurrentMapMusic)
        StartPlayer(&gMPlayInfo_BGM);
}

void FadeOutBGM(u8 speed)
{
    (void)speed;
    StopPlayer(&gMPlayInfo_BGM);
}

bool8 IsBGMStopped(void)
{
    return !(gMPlayInfo_BGM.status & MUSICPLAYER_STATUS_TRACK);
}

void PlayCry_Normal(u16 species, s8 pan) { (void)species; (void)pan; sCryFrames = 30; }
void PlayCry_NormalNoDucking(u16 species, s8 pan, s8 volume, u8 priority)
{ (void)species; (void)pan; (void)volume; (void)priority; sCryFrames = 30; }
void PlayCry_ByMode(u16 species, s8 pan, u8 mode)
{ (void)species; (void)pan; (void)mode; sCryFrames = 30; }
void PlayCry_ReleaseDouble(u16 species, s8 pan, u8 mode)
{ PlayCry_ByMode(species, pan, mode); }
void PlayCry_Script(u16 species, u8 mode)
{ (void)species; (void)mode; sCryFrames = 30; }
void PlayCryInternal(u16 species, s8 pan, s8 volume, u8 priority, u8 mode)
{ (void)species; (void)pan; (void)volume; (void)priority; (void)mode; sCryFrames = 30; }

bool8 IsCryFinished(void) { return sCryFrames == 0; }
void StopCryAndClearCrySongs(void) { sCryFrames = 0; }
void StopCry(void) { sCryFrames = 0; }
bool8 IsCryPlayingOrClearCrySongs(void) { return sCryFrames != 0; }
bool8 IsCryPlaying(void) { return sCryFrames != 0; }

void PlayBGM(u16 songNum)
{
    sCurrentMapMusic = songNum;
    if (sDisableMusic || songNum == 0)
        StopPlayer(&gMPlayInfo_BGM);
    else
        StartPlayer(&gMPlayInfo_BGM);
}

void PlaySE(u16 songNum) { (void)songNum; sSeFrames = 8; StartPlayer(&gMPlayInfo_SE1); }
void PlaySE12WithPanning(u16 songNum, s8 pan) { (void)pan; PlaySE(songNum); }
void PlaySE1WithPanning(u16 songNum, s8 pan) { (void)pan; PlaySE(songNum); }
void PlaySE2WithPanning(u16 songNum, s8 pan) { (void)pan; PlaySE(songNum); }
void SE12PanpotControl(s8 pan) { (void)pan; }
bool8 IsSEPlaying(void) { return sSeFrames != 0; }
bool8 IsBGMPlaying(void) { return !IsBGMStopped(); }
bool8 IsSpecialSEPlaying(void) { return sSeFrames != 0; }
void SetBGMVolume_SuppressHelpSystemReduction(u16 volume) { (void)volume; }
void BGMVolumeMax_EnableHelpSystemReduction(void) {}

void SetPokemonCryPriority(u8 val)
{
    gPokemonCrySong.priority = val;
}
