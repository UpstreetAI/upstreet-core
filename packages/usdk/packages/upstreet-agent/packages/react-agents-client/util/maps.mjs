export class PlayersMap extends EventTarget {
  #internalMap = new Map(); // playerId: string -> Player
  getMap() {
    return this.#internalMap;
  }
  get(playerId) {
    return this.#internalMap.get(playerId);
  }
  has(playerId) {
    return this.#internalMap.has(playerId);
  }
  add(playerId, player) {
    this.#internalMap.set(playerId, player);
    this.dispatchEvent(new MessageEvent('join', {
      data: {
        player,
      },
    }));
  }
  remove(playerId) {
    const player = this.#internalMap.get(playerId);
    if (player) {
      this.#internalMap.delete(playerId);
      this.dispatchEvent(new MessageEvent('leave', {
        data: {
          player,
        },
      }));
    } else {
      console.error(`Player ${playerId} not found in map`);
    }
  }
  clear() {
    for (const [playerId, player] of this.#internalMap) {
      this.dispatchEvent(new MessageEvent('leave', {
        data: {
          player,
        },
      }));
    }
    this.#internalMap.clear();
  }
}
export class TypingMap extends EventTarget {
  #internalMap = new Map(); // playerId: string -> { userId: string, name: string, typing: boolean }
  // getMap() {
  //   return this.#internalMap;
  // }
  get(playerId) {
    return this.#internalMap.get(playerId);
  }
  set(playerId, typing) {
    this.#internalMap.set(playerId, typing);
    this.dispatchEvent(new MessageEvent('typingchange', {
      data: {
        playerId,
        typing,
      },
    }));
  }
  clear() {
    for (const [playerId, typing] of this.#internalMap) {
      this.dispatchEvent(new MessageEvent('typingchange', {
        data: {
          playerId,
          typing,
        },
      }));
    }
    this.#internalMap.clear();
  }
}
export class SpeakerMap extends EventTarget {
  #internalMap = new Map(); // playerId: string -> boolean
  // getMap() {
  //   return this.#internalMap;
  // }
  get(playerId) {
    return this.#internalMap.get(playerId);
  }
  set(playerId, speaking) {
    this.#internalMap.set(playerId, speaking);
    this.dispatchEvent(new MessageEvent('speakingchange', {
      data: {
        playerId,
        speaking,
      },
    }));
  }
  clear() {
    for (const [playerId, speaking] of this.#internalMap) {
      this.dispatchEvent(new MessageEvent('speakingchange', {
        data: {
          playerId,
          speaking,
        },
      }));
    }
    this.#internalMap.clear();
  }

  /* #localSpeakingCount = 0;
  #lastPlaying = false;
  getRemote(playerId) {
    return this.#internalMap.get(playerId) ?? 0;
  }
  addRemote(playerId) {
    const currentCount = this.#internalMap.get(playerId) ?? 0;
    this.#internalMap.set(playerId, currentCount + 1);
    this.dispatchEvent(new MessageEvent('speakingchange', {
      data: {
        playerId,
        speaking: true,
      },
    }));

    if (currentCount === 0) {
      const currentPlaying = Array.from(this.#internalMap.values()).some(count => count > 0);
      if (currentPlaying && !this.#lastPlaying) {
        this.dispatchEvent(new MessageEvent('playingchange', {
          data: {
            playing: true,
          },
        }));
      }
      this.#lastPlaying = currentPlaying;
    }
  }
  removeRemote(playerId) {
    const currentCount = this.#internalMap.get(playerId) ?? 0;
    if (currentCount > 0) {
      this.#internalMap.set(playerId, currentCount - 1);
      this.dispatchEvent(new MessageEvent('speakingchange', {
        data: {
          playerId,
          speaking: currentCount - 1 > 0,
        },
      }));

      if (currentCount === 1) {
        this.#internalMap.delete(playerId);

        const currentPlaying = Array.from(this.#internalMap.values()).some(count => count > 0);
        if (!currentPlaying && this.#lastPlaying) {
          this.dispatchEvent(new MessageEvent('playingchange', {
            data: {
              playing: false,
            },
          }));
        }
        this.#lastPlaying = currentPlaying;
      }
    } else {
      throw new Error(`Player ${playerId} not found in map`);
    }
  }
  getLocal() {
    return this.#localSpeakingCount;
  }
  addLocal() {
    if (this.#localSpeakingCount === 0) {
      this.dispatchEvent(new MessageEvent('localspeakingchange', {
        data: {
          speaking: true,
        },
      }));
    }
    this.#localSpeakingCount += 1;
  }
  removeLocal() {
    if (this.#localSpeakingCount > 0) {
      this.#localSpeakingCount -= 1;
      if (this.#localSpeakingCount === 0) {
        this.dispatchEvent(new MessageEvent('localspeakingchange', {
          data: {
            speaking: false,
          },
        }));
      }
    }
  }
  clear() {
    // emit events
    for (const [playerId, speaking] of this.#internalMap) {
      this.dispatchEvent(new MessageEvent('speakingchange', {
        data: {
          playerId,
          speaking,
        },
      }));
    }
    if (this.#lastPlaying) {
      this.dispatchEvent(new MessageEvent('playingchange', {
        data: {
          playing: false,
        },
      }));
    }
    if (this.#localSpeakingCount > 0) {
      this.dispatchEvent(new MessageEvent('localspeakingchange', {
        data: {
          speaking: false,
        },
      }));
    }

    // reset state
    this.#internalMap.clear();
    this.#localSpeakingCount = 0;
    this.#lastPlaying = false;
  } */
}