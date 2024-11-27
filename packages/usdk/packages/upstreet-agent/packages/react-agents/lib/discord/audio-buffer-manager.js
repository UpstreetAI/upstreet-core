export class AudioBufferManager {
    constructor() {
      this.buffers = new Map(); // streamId -> buffer array
    }
  
    createBuffer(streamId) {
      if (this.buffers.has(streamId)) {
        console.warn('Buffer already exists for stream', streamId);
        return;
      }
      this.buffers.set(streamId, []);
      console.log('Created buffer for stream', streamId);
    }
  
    addChunk(streamId, chunk) {
      if (!this.buffers.has(streamId)) {
        console.warn('No buffer found for stream', streamId);
        return false;
      }
      this.buffers.get(streamId).push(chunk);
      return true;
    }
  
    getBuffer(streamId) {
      return this.buffers.get(streamId) || [];
    }
  
    markComplete(streamId) {
      const buffer = this.buffers.get(streamId);
      if (buffer) {
        buffer.isComplete = true;
        console.log(`Marked buffer complete for stream ${streamId} with ${buffer.length} chunks`);
      }
    }
  
    deleteBuffer(streamId) {
      this.buffers.delete(streamId);
      console.log('Deleted buffer for stream', streamId);
    }
  
    hasBuffer(streamId) {
      return this.buffers.has(streamId);
    }
  }