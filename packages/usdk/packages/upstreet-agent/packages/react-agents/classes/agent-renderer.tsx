import React, { useEffect, Component, ReactNode } from 'react';
import ReactReconciler from 'react-reconciler';
import {
  ConcurrentRoot,
  DefaultEventPriority,
} from 'react-reconciler/constants'
import { QueueManager } from 'queue-manager';
import {
  SubtleAi,
} from './subtle-ai';
import { AppContext } from '../context';
import type {
  InstanceChild,
  ChatsSpecification,
} from '../types';
import { RenderLoader } from './render-loader';
import { SupabaseStorage } from '../storage/supabase-storage.mjs';
import { makePromise } from '../util/util.mjs';
import { ConversationManager } from './conversation-manager';
import { AppContextValue } from './app-context-value';
import { getConnectedWalletsFromMnemonic } from '../util/ethereum-utils.mjs';
import {
  RenderRegistry,
  Instance,
  TextInstance,
} from './render-registry';

//

type ChildrenProps = {
  children?: ReactNode,
};
class ErrorBoundary extends Component<
  ChildrenProps,
  {
    hasError: boolean;
  }
> {
  localProps: ChildrenProps;
  state: {
    hasError: boolean,
  } = {
    hasError: false,
  };
  constructor(props: ChildrenProps) {
    super(props);
    this.localProps = props;
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    // console.log('get derived state from error', error);
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.warn('renderer crashed', error, info);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (<></>);
    }

    return this.localProps.children;
  }
}
const AppComponent = ({
  node,
  appContextValue,
  topLevelRenderPromise,
}: {
  node: ReactNode,
  appContextValue: AppContextValue,
  topLevelRenderPromise: any
}) => {
  useEffect(() => {
    topLevelRenderPromise.resolve(null);
  }, [topLevelRenderPromise]);

  return (
    <ErrorBoundary>
      <AppContext.Provider value={appContextValue}>
        {node}
      </AppContext.Provider>
    </ErrorBoundary>
  )
};

//

export class AgentRenderer {
  env: any;
  config: any;
  chatsSpecification: ChatsSpecification;
  supabase: any;
  codecs: any;

  registry: RenderRegistry;
  conversationManager: ConversationManager;
  appContextValue: AppContextValue;

  reconciler: any;
  container: any;
  root: any;
  renderLoader: RenderLoader;

  renderPromise = makePromise();
  renderPromiseResolved = false;
  renderQueueManager: QueueManager;

  constructor({
    env,
    config,
    chatsSpecification,
    supabase,
    codecs,
  }: {
    env: any;
    config: any;
    chatsSpecification: ChatsSpecification;
    supabase: any;
    codecs: any;
  }) {
    // latch arguments
    this.env = env;
    this.config = config;
    this.chatsSpecification = chatsSpecification;
    this.supabase = supabase;
    this.codecs = codecs;

    // create the app context
    this.registry = new RenderRegistry();
    this.conversationManager = new ConversationManager({
      registry: this.registry,
    });
    const subtleAi = new SubtleAi();
    const useConfig = () => {
      return this.config;
    };
    const useEnv = () => {
      return this.env;
    }
    const useEnvironment = () => {
      return this.env.WORKER_ENV as string;
    };
    const useWallets = () => {
      const mnemonic = this.env.WALLET_MNEMONIC as string;
      const wallets = getConnectedWalletsFromMnemonic(mnemonic);
      return wallets;
    };
    const useAuthToken = () => {
      return this.env.AGENT_TOKEN;
    };
    const useSupabase = () => {
      return this.supabase;
    };
    const useConversationManager = () => {
      return this.conversationManager;
    };
    const useChatsSpecification = () => {
      return this.chatsSpecification;
    };
    const useCodecs = () => {
      return this.codecs;
    };
    const useInit = () => {
      return this.env.init ?? {};
    };
    const useRuntime = () => {
      return {
        getSetting: (key: string) => {
          return ''; // XXX finish this
        },
      };
    };
    const useDebug = () => {
      return this.env.debug ?? 0;
    };
    const useRegistry = () => {
      return this.registry;
    };
    this.appContextValue = new AppContextValue({
      subtleAi,
      config: useConfig(),
      env: useEnv(),
      environment: useEnvironment(),
      wallets: useWallets(),
      authToken: useAuthToken(),
      supabase: useSupabase(),
      conversationManager: useConversationManager(),
      chatsSpecification: useChatsSpecification(),
      codecs: useCodecs(),
      init: useInit(),
      runtime: useRuntime(),
      debug: useDebug(),
      registry: useRegistry(),
    });

    // run the module to get the result
    let currentUpdatePriority = DefaultEventPriority;
    const opts = {
      supportsMutation: true,
      isPrimaryRenderer: true,
      getRootHostContext: () => {
        return {};
      },
      getChildHostContext: (parentHostContext: any, type: string, rootContainer: any) => {
        return parentHostContext;
      },
      getCurrentEventPriority: () => {
        return DefaultEventPriority;
      },
      resolveUpdatePriority: () => currentUpdatePriority || DefaultEventPriority,
      getCurrentUpdatePriority: () => currentUpdatePriority,
      setCurrentUpdatePriority: (newPriority: number) => {
        currentUpdatePriority = newPriority;
      },
      maySuspendCommit: (type: string, props: object) => {
        return false;
      },
      startSuspendingCommit: () => {},
      waitForCommitToBeReady: () => null,
      prepareForCommit: () => {
        // console.log('prepare for commit');
        return null;
      },
      resetAfterCommit: () => {
        // console.log('reset after commit');
        this.registry.load(this.container);
        // console.log('registry updated:', Array.from(this.registry.agents.values()));
        // console.log('registry updated:', inspect(Array.from(this.registry.agents.values()), {
        //   depth: 3,
        // }));
      },
      scheduleTimeout: setTimeout,
      cancelTimeout: clearTimeout,
      clearContainer: (container: any) => {
        // console.log('clear container', [container]);
        container.children.length = 0;
      },
      createInstance(type: string, props: object, rootContainer: any, hostContext: any, internalHandle: any) {
        // console.log('create instance', [type, props]);
        return new Instance(type, props);
      },
      createTextInstance: (text: string, rootContainer: any, hostContext: any, internalHandle: any) => {
        // console.log('create text instance', [text]);
        return new TextInstance(text);
      },
      appendInitialChild: (parent: Instance, child: InstanceChild) => {
        parent.children.push(child);
      },
      finalizeInitialChildren: (instance: Instance, type: string, props: object, rootContainer: any, hostContext: any) => {
        return false;
      },
      commitUpdate: (instance: Instance, type: string, oldProps: object, newProps: object, internalHandle: any) => {
        // console.log('commit update', [type, oldProps, newProps]);
        instance.type = type;
        instance.props = newProps;
      },
      shouldSetTextContent: (type: string, props: object) => {
        return false;
      },
      hideInstance: (instance: Instance) => {
        instance.visible = false;
      },
      unhideInstance: (instance: Instance) => {
        instance.visible = true;
      },
      hideTextInstance: (textInstance: TextInstance) => {
        textInstance.visible = false;
      },
      unhideTextInstance: (textInstance: TextInstance) => {
        textInstance.visible = true;
      },
      detachDeletedInstance: (instance: Instance) => {
        // console.log('detach deleted instance', [instance]);
      },
      appendChild: (container: Instance, child: InstanceChild) => {
        container.children.push(child);
      },
      appendChildToContainer: (container: Instance, child: InstanceChild) => {
        container.children.push(child);
      },
      insertBefore: (parent: Instance, child: InstanceChild, beforeChild: InstanceChild) => {
        const index = parent.children.indexOf(beforeChild);
        parent.children.splice(index, 0, child);
      },
      insertInContainerBefore: (container: Instance, child: InstanceChild, beforeChild: InstanceChild) => {
        const index = container.children.indexOf(beforeChild);
        container.children.splice(index, 0, child);
      },
      removeChild: (parent: Instance, child: InstanceChild) => {
        const index = parent.children.indexOf(child);
        parent.children.splice(index, 1);
      },
      removeChildFromContainer: (container: Instance, child: InstanceChild) => {
        const index = container.children.indexOf(child);
        container.children.splice(index, 1);
      },
    };
    const reconciler = ReactReconciler(opts);
    this.reconciler = reconciler;
    this.container = new Instance('container');
    const root = reconciler.createContainer(
      this.container, // containerInfo
      ConcurrentRoot, // tag
      null, // hydrationCallbacks
      env['WORKER_ENV'] !== 'production', // isStrictMode
      null, // concurrentUpdatesByDefaultOverride
      '', // identifierPrefix
      (error: Error) => console.warn('Uncaught error', error.stack), // onUncaughtError
      (error: Error) => console.warn('Caught error', error.stack), // onCaughtError
      (error: Error) => console.warn('Recoverable error', error.stack), // onRecoverableError
      null // transitionCallbacks
    );

    this.root = root;
    this.renderLoader = new RenderLoader();

    this.renderQueueManager = new QueueManager();
  }

  // rendering

  async #renderProps(props: {
    node: ReactNode,
    appContextValue: AppContextValue,
  }) {
    const props2 = {
      node: props.node,
      appContextValue: props.appContextValue,
      topLevelRenderPromise: makePromise(),
    }
    this.renderLoader.clear();
    this.renderLoader.useLoad(props2.topLevelRenderPromise);

    await new Promise((accept, reject) => {
      const element = (
        <AppComponent
          {...props2}
        />
      );
      this.reconciler.updateContainer(element, this.root, null, () => {
        accept(null);
      });
    });

    await this.renderLoader.waitForLoad();
  }
  async render(node: ReactNode) {
    const {
      appContextValue,
    } = this;

    const props = {
      node,
      appContextValue,
    };
    try {
      await this.#renderProps(props);

      if (!this.renderPromiseResolved) {
        this.renderPromiseResolved = true;
        this.renderPromise.resolve(null);
      }
    } catch (error) {
      console.warn('Error during render', error.stack);
      throw error;
    }
  }
  unmount() {
    this.reconciler.updateContainer(null, this.root, null, () => {});
  }

  // note: needs to be async to wait for React to resolves
  // this is used to e.g. fetch the chat history in user code
  async waitForRender() {
    await this.renderPromise;
  }
  async ensureRegistry() {
    await this.waitForRender();
    return this.registry;
  }
}