export class QueueManager extends EventTarget {
    constructor({
      parallelism = 1,
    } = {}) {
      super();
  
      this.parallelism = parallelism;
  
      this.numRunning = 0;
      this.queue = [];
    }
    isIdle() {
      return this.numRunning === 0;
    }
    async waitForTurn(fn) {
      if (this.numRunning < this.parallelism) {
        this.numRunning++;
        if (this.numRunning === 1) {
          this.dispatchEvent(new MessageEvent('idlechange', {
            data: {
              idle: false,
            },
          }));
        }
  
        let result, error;
        try {
          result = await fn();
        } catch(err) {
          error = err;
        }
  
        this.numRunning--;
        if (this.queue.length > 0) {
          const fn2 = this.queue.shift();
          this.waitForTurn(fn2);
        } else {
          if (this.numRunning === 0) {
            this.dispatchEvent(new MessageEvent('idlechange', {
              data: {
                idle: true,
              },
            }));
          }
        }
  
        if (!error) {
          return result;
        } else {
          throw error;
        }
      } else {
        const {
          promise,
          resolve,
          reject,
        } = Promise.withResolvers();
        this.queue.push(async () => {
          let result, error;
          try {
            result = await fn();
          } catch(err) {
            error = err;
          }
  
          if (!error) {
            resolve(result);
            return result;
          } else {
            reject(error);
            throw error;
          }
        });
        const result = await promise;
        return result;
      }
    }
  }