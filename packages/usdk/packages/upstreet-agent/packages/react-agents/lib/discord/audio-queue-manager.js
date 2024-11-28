import { QueueManager } from "queue-manager";
export class AudioQueueManager {
    constructor() {
      this.queue = new QueueManager({ parallelism: 1 });
      this.activeStreams = new Map(); // streamId -> {status, resolve}
    }
  
    async queueAudio(streamId, sendStreamFn) {
      if (this.activeStreams.has(streamId)) {
        console.warn('Stream already exists for stream', streamId);
        return;
      }
  
      await this.queue.waitForTurn(async () => {
        return new Promise(resolve => {
          this.activeStreams.set(streamId, {
            status: 'playing',
            resolve
          });
  
          // Start sending the stream
          sendStreamFn();
        });
      });
    }
  
    completeStream(streamId) {
      const stream = this.activeStreams.get(streamId);
      if (stream) {
        stream.status = 'completed';
        stream.resolve();
        this.activeStreams.delete(streamId);
      }
    }
  
    getStream(streamId) {
      return this.activeStreams.get(streamId);
    }
  
    hasStream(streamId) {
      return this.activeStreams.has(streamId);
    }
  }