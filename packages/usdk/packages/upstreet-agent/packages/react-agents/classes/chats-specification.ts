import type {
  RoomSpecification,
} from '../types';
import { QueueManager } from 'queue-manager';
import {
  ExtendableMessageEvent,
} from '../util/extendable-message-event';
import { getUserIdForJwt } from '../util/supabase-client.mjs';

//

export const roomsSpecificationEquals = (a: RoomSpecification, b: RoomSpecification) => {
  return a.room === b.room && a.endpointUrl === b.endpointUrl;
};

//

const getRoomsSpecificationKey = (roomSpecification: RoomSpecification) => {
  return [
    roomSpecification.room,
    roomSpecification.endpointUrl,
  ].join(':');
};

//

// tracks the chats that the currently active agents should connect to
export class ChatsSpecification extends EventTarget {
  // members
  supabase: any;
  userId: string;
  // state
  roomSpecifications: RoomSpecification[];
  roomsQueueManager: QueueManager;
  loadPromise: Promise<void>;

  constructor({
    supabase,
    jwt,
  }: {
    supabase: any,
    jwt: string,
  }) {
    super();

    this.supabase = supabase;

    this.roomSpecifications = [];
    this.roomsQueueManager = new QueueManager();
    this.loadPromise = (async () => {
      this.userId = await getUserIdForJwt(jwt);

      const result = await this.supabase.from('chat_specifications')
        .select('*')
        .eq('user_id', this.userId);
      const {
        error,
        data,
      } = result;
      if (!error) {
        const initialChatSpecifications = data.map((o: any) => {

          // o.data contains the room and endpoint_url
          const {
            room,
            endpoint_url: endpointUrl,
          } = o.data;
          return {
            room,
            endpointUrl,
          };
        }) as RoomSpecification[];
        // console.log('initial chat specifications', initialChatSpecifications);
        await Promise.all(initialChatSpecifications.map(async (chatSpecification) => {
          const result = await this.#joinInternal(chatSpecification);
          return result;
        }));
      } else {
        console.warn('failed to load initial chats: ' + JSON.stringify(error));
      }
    })();
  }

  waitForLoad() {
    return this.loadPromise;
  }

  async join(roomSpecification: RoomSpecification) {
    if (!roomSpecification.room || !roomSpecification.endpointUrl) {
      throw new Error('join | roomSpecification must have room and endpointUrl: ' + JSON.stringify(roomSpecification));
    }

    await this.waitForLoad();

    return await this.#joinInternal(roomSpecification);
  }
  async #joinInternal(roomSpecification: RoomSpecification) {
    if (!roomSpecification.room || !roomSpecification.endpointUrl) {
      throw new Error('join | roomSpecification must have room and endpointUrl: ' + JSON.stringify(roomSpecification));
    }

    // console.log('join room 1', roomSpecification);
    // console.log('join room 1.1',  roomSpecification);

    const index = this.roomSpecifications.findIndex((spec) => roomsSpecificationEquals(spec, roomSpecification));
    if (index === -1) {
      this.roomSpecifications.push(roomSpecification);
      
      const _emitJoinEvent = async () => {
        // console.log('emit join event', roomSpecification);
        const e = new ExtendableMessageEvent<RoomSpecification>('join', {
          data: roomSpecification,
        });
        this.dispatchEvent(e);
        await e.waitForFinish();
      };

      const _insertRow = async () => {
        await this.roomsQueueManager.waitForTurn(async () => {
          const key = getRoomsSpecificationKey(roomSpecification);
          const existing = await this.supabase.from('chat_specifications')
            .select('*')
            .eq('id', key)
            .eq('user_id', this.userId)
            .single();

          if (existing.data) {
            // console.log('chat specification already exists:', existing.data);
            return;
          }

          const opts = {
            id: key,
            user_id: this.userId,
            data: {
              room: roomSpecification.room,
              endpoint_url: roomSpecification.endpointUrl,
            },
          };
          // console.log('upserting chat specification:', opts);
          const result = await this.supabase.from('chat_specifications')
            .upsert(opts);
          const {
            error,
          } = result;
          if (!error) {
            // nothing
          } else {
            throw new Error('failed to insert chat specification: ' + JSON.stringify(error));
          }
        });
      };
      await Promise.all([
        _emitJoinEvent(),
        _insertRow(),
      ]);
      // console.log('join room 2');
    } else {
      // throw new Error('chat already joined: ' + JSON.stringify(roomSpecification));
      // console.log('chat already joined previously');
    }
  }
  async leave(roomSpecification: RoomSpecification) {
    if (!roomSpecification.room || !roomSpecification.endpointUrl) {
      throw new Error('leave | roomSpecification must have room and endpointUrl: ' + JSON.stringify(roomSpecification));
    }

    await this.waitForLoad();

    return await this.#leaveInternal(roomSpecification);
  }
  async #leaveInternal(roomSpecification: RoomSpecification) {
    // console.log('leave room 1', roomSpecification);
    const index = this.roomSpecifications.findIndex((spec) => roomsSpecificationEquals(spec, roomSpecification));
    if (index !== -1) {
      this.roomSpecifications.splice(index, 1);

      const _emitLeaveEvent = async () => {
        const e = new ExtendableMessageEvent<RoomSpecification>('leave', {
          data: roomSpecification,
        });
        this.dispatchEvent(e);
        await e.waitForFinish();
      };
      const _deleteRow = async () => {
        await this.roomsQueueManager.waitForTurn(async () => {
          const key = getRoomsSpecificationKey(roomSpecification);
          const result = await this.supabase.from('chat_specifications')
            .delete()
            .eq('id', key);
          const {
            error,
          } = result;
          if (!error) {
            // nothing
          } else {
            throw new Error('failed to delete chat specification: ' + JSON.stringify(error));
          }
        });
      };
      await Promise.all([
        _emitLeaveEvent(),
        _deleteRow(),
      ]);
      // console.log('leave room 2', roomSpecification);
    } else {
      throw new Error('chat not joined: ' + JSON.stringify(roomSpecification));
    }
  }
  async leaveAll() {
    await this.waitForLoad();

    return await this.#leaveAllInternal();
  }
  async #leaveAllInternal() {
    const _emitLeaveEvent = async (roomSpecification: RoomSpecification) => {
      const e = new ExtendableMessageEvent<RoomSpecification>('leave', {
        data: roomSpecification,
      });
      this.dispatchEvent(e);
      await e.waitForFinish();
    };
    const _emitLeaveEvents = async () => {
      return await Promise.all(this.roomSpecifications.map(async (roomSpecification) => {
        await _emitLeaveEvent(roomSpecification);
      }));
    };
    const _deleteAllRows = async () => {
      await this.roomsQueueManager.waitForTurn(async () => {
        const result = await this.supabase.from('chat_specifications')
          .delete()
          .eq('user_id', this.userId);
        const {
          error,
        } = result;
        if (!error) {
          // nothing
        } else {
          throw new Error('failed to delete chat specifications: ' + JSON.stringify(error));
        }
      });
    };

    await Promise.all([
      _emitLeaveEvents(),
      _deleteAllRows(),
    ]);
  }
}