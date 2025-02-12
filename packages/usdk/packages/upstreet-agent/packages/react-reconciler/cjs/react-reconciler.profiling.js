/**
 * @license React
 * react-reconciler.profiling.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";
module.exports = function ($$$config) {
  function createFiber(tag, pendingProps, key, mode) {
    return new FiberNode(tag, pendingProps, key, mode);
  }
  function noop() {}
  function formatProdErrorMessage(code) {
    var url = "https://react.dev/errors/" + code;
    if (1 < arguments.length) {
      url += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var i = 2; i < arguments.length; i++)
        url += "&args[]=" + encodeURIComponent(arguments[i]);
    }
    return (
      "Minified React error #" +
      code +
      "; visit " +
      url +
      " for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
    );
  }
  function getIteratorFn(maybeIterable) {
    if (null === maybeIterable || "object" !== typeof maybeIterable)
      return null;
    maybeIterable =
      (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
      maybeIterable["@@iterator"];
    return "function" === typeof maybeIterable ? maybeIterable : null;
  }
  function getComponentNameFromType(type) {
    if (null == type) return null;
    if ("function" === typeof type)
      return type.$$typeof === REACT_CLIENT_REFERENCE
        ? null
        : type.displayName || type.name || null;
    if ("string" === typeof type) return type;
    switch (type) {
      case REACT_FRAGMENT_TYPE:
        return "Fragment";
      case REACT_PORTAL_TYPE:
        return "Portal";
      case REACT_PROFILER_TYPE:
        return "Profiler";
      case REACT_STRICT_MODE_TYPE:
        return "StrictMode";
      case REACT_SUSPENSE_TYPE:
        return "Suspense";
      case REACT_SUSPENSE_LIST_TYPE:
        return "SuspenseList";
    }
    if ("object" === typeof type)
      switch (type.$$typeof) {
        case REACT_CONTEXT_TYPE:
          return (type.displayName || "Context") + ".Provider";
        case REACT_CONSUMER_TYPE:
          return (type._context.displayName || "Context") + ".Consumer";
        case REACT_FORWARD_REF_TYPE:
          var innerType = type.render;
          type = type.displayName;
          type ||
            ((type = innerType.displayName || innerType.name || ""),
            (type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef"));
          return type;
        case REACT_MEMO_TYPE:
          return (
            (innerType = type.displayName || null),
            null !== innerType
              ? innerType
              : getComponentNameFromType(type.type) || "Memo"
          );
        case REACT_LAZY_TYPE:
          innerType = type._payload;
          type = type._init;
          try {
            return getComponentNameFromType(type(innerType));
          } catch (x) {}
      }
    return null;
  }
  function describeBuiltInComponentFrame(name) {
    if (void 0 === prefix)
      try {
        throw Error();
      } catch (x) {
        var match = x.stack.trim().match(/\n( *(at )?)/);
        prefix = (match && match[1]) || "";
        suffix =
          -1 < x.stack.indexOf("\n    at")
            ? " (<anonymous>)"
            : -1 < x.stack.indexOf("@")
            ? "@unknown:0:0"
            : "";
      }
    return "\n" + prefix + name + suffix;
  }
  function describeNativeComponentFrame(fn, construct) {
    if (!fn || reentry) return "";
    reentry = !0;
    var previousPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    var RunInRootFrame = {
      DetermineComponentFrameRoot: function () {
        try {
          if (construct) {
            var Fake = function () {
              throw Error();
            };
            Object.defineProperty(Fake.prototype, "props", {
              set: function () {
                throw Error();
              }
            });
            if ("object" === typeof Reflect && Reflect.construct) {
              try {
                Reflect.construct(Fake, []);
              } catch (x) {
                var control = x;
              }
              Reflect.construct(fn, [], Fake);
            } else {
              try {
                Fake.call();
              } catch (x$0) {
                control = x$0;
              }
              fn.call(Fake.prototype);
            }
          } else {
            try {
              throw Error();
            } catch (x$1) {
              control = x$1;
            }
            (Fake = fn()) &&
              "function" === typeof Fake.catch &&
              Fake.catch(function () {});
          }
        } catch (sample) {
          if (sample && control && "string" === typeof sample.stack)
            return [sample.stack, control.stack];
        }
        return [null, null];
      }
    };
    RunInRootFrame.DetermineComponentFrameRoot.displayName =
      "DetermineComponentFrameRoot";
    var namePropDescriptor = Object.getOwnPropertyDescriptor(
      RunInRootFrame.DetermineComponentFrameRoot,
      "name"
    );
    namePropDescriptor &&
      namePropDescriptor.configurable &&
      Object.defineProperty(
        RunInRootFrame.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
    try {
      var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(),
        sampleStack = _RunInRootFrame$Deter[0],
        controlStack = _RunInRootFrame$Deter[1];
      if (sampleStack && controlStack) {
        var sampleLines = sampleStack.split("\n"),
          controlLines = controlStack.split("\n");
        for (
          namePropDescriptor = RunInRootFrame = 0;
          RunInRootFrame < sampleLines.length &&
          !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot");

        )
          RunInRootFrame++;
        for (
          ;
          namePropDescriptor < controlLines.length &&
          !controlLines[namePropDescriptor].includes(
            "DetermineComponentFrameRoot"
          );

        )
          namePropDescriptor++;
        if (
          RunInRootFrame === sampleLines.length ||
          namePropDescriptor === controlLines.length
        )
          for (
            RunInRootFrame = sampleLines.length - 1,
              namePropDescriptor = controlLines.length - 1;
            1 <= RunInRootFrame &&
            0 <= namePropDescriptor &&
            sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor];

          )
            namePropDescriptor--;
        for (
          ;
          1 <= RunInRootFrame && 0 <= namePropDescriptor;
          RunInRootFrame--, namePropDescriptor--
        )
          if (
            sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]
          ) {
            if (1 !== RunInRootFrame || 1 !== namePropDescriptor) {
              do
                if (
                  (RunInRootFrame--,
                  namePropDescriptor--,
                  0 > namePropDescriptor ||
                    sampleLines[RunInRootFrame] !==
                      controlLines[namePropDescriptor])
                ) {
                  var frame =
                    "\n" +
                    sampleLines[RunInRootFrame].replace(" at new ", " at ");
                  fn.displayName &&
                    frame.includes("<anonymous>") &&
                    (frame = frame.replace("<anonymous>", fn.displayName));
                  return frame;
                }
              while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
            }
            break;
          }
      }
    } finally {
      (reentry = !1), (Error.prepareStackTrace = previousPrepareStackTrace);
    }
    return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "")
      ? describeBuiltInComponentFrame(previousPrepareStackTrace)
      : "";
  }
  function describeFiber(fiber) {
    switch (fiber.tag) {
      case 26:
      case 27:
      case 5:
        return describeBuiltInComponentFrame(fiber.type);
      case 16:
        return describeBuiltInComponentFrame("Lazy");
      case 13:
        return describeBuiltInComponentFrame("Suspense");
      case 19:
        return describeBuiltInComponentFrame("SuspenseList");
      case 0:
      case 15:
        return (fiber = describeNativeComponentFrame(fiber.type, !1)), fiber;
      case 11:
        return (
          (fiber = describeNativeComponentFrame(fiber.type.render, !1)), fiber
        );
      case 1:
        return (fiber = describeNativeComponentFrame(fiber.type, !0)), fiber;
      default:
        return "";
    }
  }
  function getStackByFiberInDevAndProd(workInProgress) {
    try {
      var info = "";
      do
        (info += describeFiber(workInProgress)),
          (workInProgress = workInProgress.return);
      while (workInProgress);
      return info;
    } catch (x) {
      return "\nError generating stack: " + x.message + "\n" + x.stack;
    }
  }
  function getNearestMountedFiber(fiber) {
    var node = fiber,
      nearestMounted = fiber;
    if (fiber.alternate) for (; node.return; ) node = node.return;
    else {
      fiber = node;
      do
        (node = fiber),
          0 !== (node.flags & 4098) && (nearestMounted = node.return),
          (fiber = node.return);
      while (fiber);
    }
    return 3 === node.tag ? nearestMounted : null;
  }
  function assertIsMounted(fiber) {
    if (getNearestMountedFiber(fiber) !== fiber)
      throw Error(formatProdErrorMessage(188));
  }
  function findCurrentFiberUsingSlowPath(fiber) {
    var alternate = fiber.alternate;
    if (!alternate) {
      alternate = getNearestMountedFiber(fiber);
      if (null === alternate) throw Error(formatProdErrorMessage(188));
      return alternate !== fiber ? null : fiber;
    }
    for (var a = fiber, b = alternate; ; ) {
      var parentA = a.return;
      if (null === parentA) break;
      var parentB = parentA.alternate;
      if (null === parentB) {
        b = parentA.return;
        if (null !== b) {
          a = b;
          continue;
        }
        break;
      }
      if (parentA.child === parentB.child) {
        for (parentB = parentA.child; parentB; ) {
          if (parentB === a) return assertIsMounted(parentA), fiber;
          if (parentB === b) return assertIsMounted(parentA), alternate;
          parentB = parentB.sibling;
        }
        throw Error(formatProdErrorMessage(188));
      }
      if (a.return !== b.return) (a = parentA), (b = parentB);
      else {
        for (var didFindChild = !1, child$2 = parentA.child; child$2; ) {
          if (child$2 === a) {
            didFindChild = !0;
            a = parentA;
            b = parentB;
            break;
          }
          if (child$2 === b) {
            didFindChild = !0;
            b = parentA;
            a = parentB;
            break;
          }
          child$2 = child$2.sibling;
        }
        if (!didFindChild) {
          for (child$2 = parentB.child; child$2; ) {
            if (child$2 === a) {
              didFindChild = !0;
              a = parentB;
              b = parentA;
              break;
            }
            if (child$2 === b) {
              didFindChild = !0;
              b = parentB;
              a = parentA;
              break;
            }
            child$2 = child$2.sibling;
          }
          if (!didFindChild) throw Error(formatProdErrorMessage(189));
        }
      }
      if (a.alternate !== b) throw Error(formatProdErrorMessage(190));
    }
    if (3 !== a.tag) throw Error(formatProdErrorMessage(188));
    return a.stateNode.current === a ? fiber : alternate;
  }
  function findCurrentHostFiber(parent) {
    parent = findCurrentFiberUsingSlowPath(parent);
    return null !== parent ? findCurrentHostFiberImpl(parent) : null;
  }
  function findCurrentHostFiberImpl(node) {
    var tag = node.tag;
    if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return node;
    for (node = node.child; null !== node; ) {
      tag = findCurrentHostFiberImpl(node);
      if (null !== tag) return tag;
      node = node.sibling;
    }
    return null;
  }
  function findCurrentHostFiberWithNoPortalsImpl(node) {
    var tag = node.tag;
    if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return node;
    for (node = node.child; null !== node; ) {
      if (
        4 !== node.tag &&
        ((tag = findCurrentHostFiberWithNoPortalsImpl(node)), null !== tag)
      )
        return tag;
      node = node.sibling;
    }
    return null;
  }
  function createCursor(defaultValue) {
    return { current: defaultValue };
  }
  function pop(cursor) {
    0 > index$jscomp$0 ||
      ((cursor.current = valueStack[index$jscomp$0]),
      (valueStack[index$jscomp$0] = null),
      index$jscomp$0--);
  }
  function push(cursor, value) {
    index$jscomp$0++;
    valueStack[index$jscomp$0] = cursor.current;
    cursor.current = value;
  }
  function clz32Fallback(x) {
    x >>>= 0;
    return 0 === x ? 32 : (31 - ((log$1(x) / LN2) | 0)) | 0;
  }
  function getLabelForLane(lane) {
    if (lane & 1) return "SyncHydrationLane";
    if (lane & 2) return "Sync";
    if (lane & 4) return "InputContinuousHydration";
    if (lane & 8) return "InputContinuous";
    if (lane & 16) return "DefaultHydration";
    if (lane & 32) return "Default";
    if (lane & 64) return "TransitionHydration";
    if (lane & 4194176) return "Transition";
    if (lane & 62914560) return "Retry";
    if (lane & 67108864) return "SelectiveHydration";
    if (lane & 134217728) return "IdleHydration";
    if (lane & 268435456) return "Idle";
    if (lane & 536870912) return "Offscreen";
    if (lane & 1073741824) return "Deferred";
  }
  function getHighestPriorityLanes(lanes) {
    var pendingSyncLanes = lanes & 42;
    if (0 !== pendingSyncLanes) return pendingSyncLanes;
    switch (lanes & -lanes) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return lanes & 4194176;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return lanes & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return lanes;
    }
  }
  function getNextLanes(root, wipLanes) {
    var pendingLanes = root.pendingLanes;
    if (0 === pendingLanes) return 0;
    var nextLanes = 0,
      suspendedLanes = root.suspendedLanes;
    root = root.pingedLanes;
    var nonIdlePendingLanes = pendingLanes & 134217727;
    0 !== nonIdlePendingLanes
      ? ((pendingLanes = nonIdlePendingLanes & ~suspendedLanes),
        0 !== pendingLanes
          ? (nextLanes = getHighestPriorityLanes(pendingLanes))
          : ((root &= nonIdlePendingLanes),
            0 !== root && (nextLanes = getHighestPriorityLanes(root))))
      : ((pendingLanes &= ~suspendedLanes),
        0 !== pendingLanes
          ? (nextLanes = getHighestPriorityLanes(pendingLanes))
          : 0 !== root && (nextLanes = getHighestPriorityLanes(root)));
    return 0 === nextLanes
      ? 0
      : 0 !== wipLanes &&
        wipLanes !== nextLanes &&
        0 === (wipLanes & suspendedLanes) &&
        ((suspendedLanes = nextLanes & -nextLanes),
        (root = wipLanes & -wipLanes),
        suspendedLanes >= root ||
          (32 === suspendedLanes && 0 !== (root & 4194176)))
      ? wipLanes
      : nextLanes;
  }
  function computeExpirationTime(lane, currentTime) {
    switch (lane) {
      case 1:
      case 2:
      case 4:
      case 8:
        return currentTime + 250;
      case 16:
      case 32:
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return currentTime + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function getLanesToRetrySynchronouslyOnError(root, originallyAttemptedLanes) {
    if (root.errorRecoveryDisabledLanes & originallyAttemptedLanes) return 0;
    root = root.pendingLanes & -536870913;
    return 0 !== root ? root : root & 536870912 ? 536870912 : 0;
  }
  function claimNextTransitionLane() {
    var lane = nextTransitionLane;
    nextTransitionLane <<= 1;
    0 === (nextTransitionLane & 4194176) && (nextTransitionLane = 128);
    return lane;
  }
  function claimNextRetryLane() {
    var lane = nextRetryLane;
    nextRetryLane <<= 1;
    0 === (nextRetryLane & 62914560) && (nextRetryLane = 4194304);
    return lane;
  }
  function createLaneMap(initial) {
    for (var laneMap = [], i = 0; 31 > i; i++) laneMap.push(initial);
    return laneMap;
  }
  function markRootFinished(root, remainingLanes, spawnedLane) {
    var noLongerPendingLanes = root.pendingLanes & ~remainingLanes;
    root.pendingLanes = remainingLanes;
    root.suspendedLanes = 0;
    root.pingedLanes = 0;
    root.expiredLanes &= remainingLanes;
    root.entangledLanes &= remainingLanes;
    root.errorRecoveryDisabledLanes &= remainingLanes;
    root.shellSuspendCounter = 0;
    remainingLanes = root.entanglements;
    for (
      var expirationTimes = root.expirationTimes,
        hiddenUpdates = root.hiddenUpdates;
      0 < noLongerPendingLanes;

    ) {
      var index$6 = 31 - clz32(noLongerPendingLanes),
        lane = 1 << index$6;
      remainingLanes[index$6] = 0;
      expirationTimes[index$6] = -1;
      var hiddenUpdatesForLane = hiddenUpdates[index$6];
      if (null !== hiddenUpdatesForLane)
        for (
          hiddenUpdates[index$6] = null, index$6 = 0;
          index$6 < hiddenUpdatesForLane.length;
          index$6++
        ) {
          var update = hiddenUpdatesForLane[index$6];
          null !== update && (update.lane &= -536870913);
        }
      noLongerPendingLanes &= ~lane;
    }
    0 !== spawnedLane && markSpawnedDeferredLane(root, spawnedLane, 0);
  }
  function markSpawnedDeferredLane(root, spawnedLane, entangledLanes) {
    root.pendingLanes |= spawnedLane;
    root.suspendedLanes &= ~spawnedLane;
    var spawnedLaneIndex = 31 - clz32(spawnedLane);
    root.entangledLanes |= spawnedLane;
    root.entanglements[spawnedLaneIndex] =
      root.entanglements[spawnedLaneIndex] |
      1073741824 |
      (entangledLanes & 4194218);
  }
  function markRootEntangled(root, entangledLanes) {
    var rootEntangledLanes = (root.entangledLanes |= entangledLanes);
    for (root = root.entanglements; rootEntangledLanes; ) {
      var index$7 = 31 - clz32(rootEntangledLanes),
        lane = 1 << index$7;
      (lane & entangledLanes) | (root[index$7] & entangledLanes) &&
        (root[index$7] |= entangledLanes);
      rootEntangledLanes &= ~lane;
    }
  }
  function addFiberToLanesMap(root, fiber, lanes) {
    if (isDevToolsPresent)
      for (root = root.pendingUpdatersLaneMap; 0 < lanes; ) {
        var index$9 = 31 - clz32(lanes),
          lane = 1 << index$9;
        root[index$9].add(fiber);
        lanes &= ~lane;
      }
  }
  function movePendingFibersToMemoized(root, lanes) {
    if (isDevToolsPresent)
      for (
        var pendingUpdatersLaneMap = root.pendingUpdatersLaneMap,
          memoizedUpdaters = root.memoizedUpdaters;
        0 < lanes;

      ) {
        var index$10 = 31 - clz32(lanes);
        root = 1 << index$10;
        index$10 = pendingUpdatersLaneMap[index$10];
        0 < index$10.size &&
          (index$10.forEach(function (fiber) {
            var alternate = fiber.alternate;
            (null !== alternate && memoizedUpdaters.has(alternate)) ||
              memoizedUpdaters.add(fiber);
          }),
          index$10.clear());
        lanes &= ~root;
      }
  }
  function lanesToEventPriority(lanes) {
    lanes &= -lanes;
    return 2 < lanes
      ? 8 < lanes
        ? 0 !== (lanes & 134217727)
          ? 32
          : 268435456
        : 8
      : 2;
  }
  function injectInternals(internals) {
    if ("undefined" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) return !1;
    var hook = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook.isDisabled || !hook.supportsFiber) return !0;
    try {
      (internals = assign({}, internals, {
        getLaneLabelMap: getLaneLabelMap,
        injectProfilingHooks: injectProfilingHooks
      })),
        (rendererID = hook.inject(internals)),
        (injectedHook = hook);
    } catch (err) {}
    return hook.checkDCE ? !0 : !1;
  }
  function onCommitRoot(root, eventPriority) {
    if (injectedHook && "function" === typeof injectedHook.onCommitFiberRoot)
      try {
        var didError = 128 === (root.current.flags & 128);
        switch (eventPriority) {
          case 2:
            var schedulerPriority = ImmediatePriority;
            break;
          case 8:
            schedulerPriority = UserBlockingPriority;
            break;
          case 32:
            schedulerPriority = NormalPriority$1;
            break;
          case 268435456:
            schedulerPriority = IdlePriority;
            break;
          default:
            schedulerPriority = NormalPriority$1;
        }
        injectedHook.onCommitFiberRoot(
          rendererID,
          root,
          schedulerPriority,
          didError
        );
      } catch (err) {}
  }
  function setIsStrictModeForDevtools(newIsStrictMode) {
    "function" === typeof log && unstable_setDisableYieldValue(newIsStrictMode);
    if (injectedHook && "function" === typeof injectedHook.setStrictMode)
      try {
        injectedHook.setStrictMode(rendererID, newIsStrictMode);
      } catch (err) {}
  }
  function injectProfilingHooks(profilingHooks) {
    injectedProfilingHooks = profilingHooks;
  }
  function getLaneLabelMap() {
    for (
      var map = new Map(), lane = 1, index$11 = 0;
      31 > index$11;
      index$11++
    ) {
      var label = getLabelForLane(lane);
      map.set(lane, label);
      lane *= 2;
    }
    return map;
  }
  function markCommitStopped() {
    null !== injectedProfilingHooks &&
      "function" === typeof injectedProfilingHooks.markCommitStopped &&
      injectedProfilingHooks.markCommitStopped();
  }
  function markComponentRenderStarted(fiber) {
    null !== injectedProfilingHooks &&
      "function" === typeof injectedProfilingHooks.markComponentRenderStarted &&
      injectedProfilingHooks.markComponentRenderStarted(fiber);
  }
  function markComponentRenderStopped() {
    null !== injectedProfilingHooks &&
      "function" === typeof injectedProfilingHooks.markComponentRenderStopped &&
      injectedProfilingHooks.markComponentRenderStopped();
  }
  function markComponentLayoutEffectUnmountStarted(fiber) {
    null !== injectedProfilingHooks &&
      "function" ===
        typeof injectedProfilingHooks.markComponentLayoutEffectUnmountStarted &&
      injectedProfilingHooks.markComponentLayoutEffectUnmountStarted(fiber);
  }
  function markComponentLayoutEffectUnmountStopped() {
    null !== injectedProfilingHooks &&
      "function" ===
        typeof injectedProfilingHooks.markComponentLayoutEffectUnmountStopped &&
      injectedProfilingHooks.markComponentLayoutEffectUnmountStopped();
  }
  function markRenderStarted(lanes) {
    null !== injectedProfilingHooks &&
      "function" === typeof injectedProfilingHooks.markRenderStarted &&
      injectedProfilingHooks.markRenderStarted(lanes);
  }
  function markRenderStopped() {
    null !== injectedProfilingHooks &&
      "function" === typeof injectedProfilingHooks.markRenderStopped &&
      injectedProfilingHooks.markRenderStopped();
  }
  function markStateUpdateScheduled(fiber, lane) {
    null !== injectedProfilingHooks &&
      "function" === typeof injectedProfilingHooks.markStateUpdateScheduled &&
      injectedProfilingHooks.markStateUpdateScheduled(fiber, lane);
  }
  function is(x, y) {
    return (x === y && (0 !== x || 1 / x === 1 / y)) || (x !== x && y !== y);
  }
  function createCapturedValueAtFiber(value, source) {
    if ("object" === typeof value && null !== value) {
      var stack = CapturedStacks.get(value);
      "string" !== typeof stack &&
        ((stack = getStackByFiberInDevAndProd(source)),
        CapturedStacks.set(value, stack));
    } else stack = getStackByFiberInDevAndProd(source);
    return { value: value, source: source, stack: stack };
  }
  function pushTreeFork(workInProgress, totalChildren) {
    forkStack[forkStackIndex++] = treeForkCount;
    forkStack[forkStackIndex++] = treeForkProvider;
    treeForkProvider = workInProgress;
    treeForkCount = totalChildren;
  }
  function pushTreeId(workInProgress, totalChildren, index) {
    idStack[idStackIndex++] = treeContextId;
    idStack[idStackIndex++] = treeContextOverflow;
    idStack[idStackIndex++] = treeContextProvider;
    treeContextProvider = workInProgress;
    var baseIdWithLeadingBit = treeContextId;
    workInProgress = treeContextOverflow;
    var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
    baseIdWithLeadingBit &= ~(1 << baseLength);
    index += 1;
    var length = 32 - clz32(totalChildren) + baseLength;
    if (30 < length) {
      var numberOfOverflowBits = baseLength - (baseLength % 5);
      length = (
        baseIdWithLeadingBit &
        ((1 << numberOfOverflowBits) - 1)
      ).toString(32);
      baseIdWithLeadingBit >>= numberOfOverflowBits;
      baseLength -= numberOfOverflowBits;
      treeContextId =
        (1 << (32 - clz32(totalChildren) + baseLength)) |
        (index << baseLength) |
        baseIdWithLeadingBit;
      treeContextOverflow = length + workInProgress;
    } else
      (treeContextId =
        (1 << length) | (index << baseLength) | baseIdWithLeadingBit),
        (treeContextOverflow = workInProgress);
  }
  function pushMaterializedTreeId(workInProgress) {
    null !== workInProgress.return &&
      (pushTreeFork(workInProgress, 1), pushTreeId(workInProgress, 1, 0));
  }
  function popTreeContext(workInProgress) {
    for (; workInProgress === treeForkProvider; )
      (treeForkProvider = forkStack[--forkStackIndex]),
        (forkStack[forkStackIndex] = null),
        (treeForkCount = forkStack[--forkStackIndex]),
        (forkStack[forkStackIndex] = null);
    for (; workInProgress === treeContextProvider; )
      (treeContextProvider = idStack[--idStackIndex]),
        (idStack[idStackIndex] = null),
        (treeContextOverflow = idStack[--idStackIndex]),
        (idStack[idStackIndex] = null),
        (treeContextId = idStack[--idStackIndex]),
        (idStack[idStackIndex] = null);
  }
  function pushHostContainer(fiber, nextRootInstance) {
    push(rootInstanceStackCursor, nextRootInstance);
    push(contextFiberStackCursor, fiber);
    push(contextStackCursor, null);
    fiber = getRootHostContext(nextRootInstance);
    pop(contextStackCursor);
    push(contextStackCursor, fiber);
  }
  function popHostContainer() {
    pop(contextStackCursor);
    pop(contextFiberStackCursor);
    pop(rootInstanceStackCursor);
  }
  function pushHostContext(fiber) {
    null !== fiber.memoizedState && push(hostTransitionProviderCursor, fiber);
    var context = contextStackCursor.current,
      nextContext = getChildHostContext(context, fiber.type);
    context !== nextContext &&
      (push(contextFiberStackCursor, fiber),
      push(contextStackCursor, nextContext));
  }
  function popHostContext(fiber) {
    contextFiberStackCursor.current === fiber &&
      (pop(contextStackCursor), pop(contextFiberStackCursor));
    hostTransitionProviderCursor.current === fiber &&
      (pop(hostTransitionProviderCursor),
      isPrimaryRenderer
        ? (HostTransitionContext._currentValue = null)
        : (HostTransitionContext._currentValue2 = null));
  }
  function throwOnHydrationMismatch(fiber) {
    var error = Error(formatProdErrorMessage(418, ""));
    queueHydrationError(createCapturedValueAtFiber(error, fiber));
    throw HydrationMismatchException;
  }
  function prepareToHydrateHostInstance(fiber, hostContext) {
    if (!supportsHydration) throw Error(formatProdErrorMessage(175));
    hydrateInstance(
      fiber.stateNode,
      fiber.type,
      fiber.memoizedProps,
      hostContext,
      fiber
    ) || throwOnHydrationMismatch(fiber);
  }
  function popToNextHostParent(fiber) {
    for (hydrationParentFiber = fiber.return; hydrationParentFiber; )
      switch (hydrationParentFiber.tag) {
        case 3:
        case 27:
          rootOrSingletonContext = !0;
          return;
        case 5:
        case 13:
          rootOrSingletonContext = !1;
          return;
        default:
          hydrationParentFiber = hydrationParentFiber.return;
      }
  }
  function popHydrationState(fiber) {
    if (!supportsHydration || fiber !== hydrationParentFiber) return !1;
    if (!isHydrating) return popToNextHostParent(fiber), (isHydrating = !0), !1;
    var shouldClear = !1;
    supportsSingletons
      ? 3 !== fiber.tag &&
        27 !== fiber.tag &&
        (5 !== fiber.tag ||
          (shouldDeleteUnhydratedTailInstances(fiber.type) &&
            !shouldSetTextContent(fiber.type, fiber.memoizedProps))) &&
        (shouldClear = !0)
      : 3 !== fiber.tag &&
        (5 !== fiber.tag ||
          (shouldDeleteUnhydratedTailInstances(fiber.type) &&
            !shouldSetTextContent(fiber.type, fiber.memoizedProps))) &&
        (shouldClear = !0);
    shouldClear && nextHydratableInstance && throwOnHydrationMismatch(fiber);
    popToNextHostParent(fiber);
    if (13 === fiber.tag) {
      if (!supportsHydration) throw Error(formatProdErrorMessage(316));
      fiber = fiber.memoizedState;
      fiber = null !== fiber ? fiber.dehydrated : null;
      if (!fiber) throw Error(formatProdErrorMessage(317));
      nextHydratableInstance =
        getNextHydratableInstanceAfterSuspenseInstance(fiber);
    } else
      nextHydratableInstance = hydrationParentFiber
        ? getNextHydratableSibling(fiber.stateNode)
        : null;
    return !0;
  }
  function resetHydrationState() {
    supportsHydration &&
      ((nextHydratableInstance = hydrationParentFiber = null),
      (isHydrating = !1));
  }
  function queueHydrationError(error) {
    null === hydrationErrors
      ? (hydrationErrors = [error])
      : hydrationErrors.push(error);
  }
  function finishQueueingConcurrentUpdates() {
    for (
      var endIndex = concurrentQueuesIndex,
        i = (concurrentlyUpdatedLanes = concurrentQueuesIndex = 0);
      i < endIndex;

    ) {
      var fiber = concurrentQueues[i];
      concurrentQueues[i++] = null;
      var queue = concurrentQueues[i];
      concurrentQueues[i++] = null;
      var update = concurrentQueues[i];
      concurrentQueues[i++] = null;
      var lane = concurrentQueues[i];
      concurrentQueues[i++] = null;
      if (null !== queue && null !== update) {
        var pending = queue.pending;
        null === pending
          ? (update.next = update)
          : ((update.next = pending.next), (pending.next = update));
        queue.pending = update;
      }
      0 !== lane && markUpdateLaneFromFiberToRoot(fiber, update, lane);
    }
  }
  function enqueueUpdate$1(fiber, queue, update, lane) {
    concurrentQueues[concurrentQueuesIndex++] = fiber;
    concurrentQueues[concurrentQueuesIndex++] = queue;
    concurrentQueues[concurrentQueuesIndex++] = update;
    concurrentQueues[concurrentQueuesIndex++] = lane;
    concurrentlyUpdatedLanes |= lane;
    fiber.lanes |= lane;
    fiber = fiber.alternate;
    null !== fiber && (fiber.lanes |= lane);
  }
  function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
    enqueueUpdate$1(fiber, queue, update, lane);
    return getRootForUpdatedFiber(fiber);
  }
  function enqueueConcurrentRenderForLane(fiber, lane) {
    enqueueUpdate$1(fiber, null, null, lane);
    return getRootForUpdatedFiber(fiber);
  }
  function markUpdateLaneFromFiberToRoot(sourceFiber, update, lane) {
    sourceFiber.lanes |= lane;
    var alternate = sourceFiber.alternate;
    null !== alternate && (alternate.lanes |= lane);
    for (var isHidden = !1, parent = sourceFiber.return; null !== parent; )
      (parent.childLanes |= lane),
        (alternate = parent.alternate),
        null !== alternate && (alternate.childLanes |= lane),
        22 === parent.tag &&
          ((sourceFiber = parent.stateNode),
          null === sourceFiber ||
            sourceFiber._visibility & 1 ||
            (isHidden = !0)),
        (sourceFiber = parent),
        (parent = parent.return);
    isHidden &&
      null !== update &&
      3 === sourceFiber.tag &&
      ((parent = sourceFiber.stateNode),
      (isHidden = 31 - clz32(lane)),
      (parent = parent.hiddenUpdates),
      (sourceFiber = parent[isHidden]),
      null === sourceFiber
        ? (parent[isHidden] = [update])
        : sourceFiber.push(update),
      (update.lane = lane | 536870912));
  }
  function getRootForUpdatedFiber(sourceFiber) {
    throwIfInfiniteUpdateLoopDetected();
    for (var parent = sourceFiber.return; null !== parent; )
      (sourceFiber = parent), (parent = sourceFiber.return);
    return 3 === sourceFiber.tag ? sourceFiber.stateNode : null;
  }
  function ensureRootIsScheduled(root) {
    root !== lastScheduledRoot &&
      null === root.next &&
      (null === lastScheduledRoot
        ? (firstScheduledRoot = lastScheduledRoot = root)
        : (lastScheduledRoot = lastScheduledRoot.next = root));
    mightHavePendingSyncWork = !0;
    didScheduleMicrotask ||
      ((didScheduleMicrotask = !0),
      scheduleImmediateTask(processRootScheduleInMicrotask));
  }
  function flushSyncWorkAcrossRoots_impl(onlyLegacy) {
    if (!isFlushingWork && mightHavePendingSyncWork) {
      isFlushingWork = !0;
      do {
        var didPerformSomeWork = !1;
        for (var root = firstScheduledRoot; null !== root; ) {
          if (!onlyLegacy) {
            var workInProgressRootRenderLanes$15 =
              workInProgressRootRenderLanes;
            workInProgressRootRenderLanes$15 = getNextLanes(
              root,
              root === workInProgressRoot ? workInProgressRootRenderLanes$15 : 0
            );
            0 !== (workInProgressRootRenderLanes$15 & 3) &&
              ((didPerformSomeWork = !0),
              performSyncWorkOnRoot(root, workInProgressRootRenderLanes$15));
          }
          root = root.next;
        }
      } while (didPerformSomeWork);
      isFlushingWork = !1;
    }
  }
  function processRootScheduleInMicrotask() {
    mightHavePendingSyncWork = didScheduleMicrotask = !1;
    for (
      var currentTime = now$1(), prev = null, root = firstScheduledRoot;
      null !== root;

    ) {
      var next = root.next;
      if (0 !== currentEventTransitionLane && shouldAttemptEagerTransition()) {
        var root$jscomp$0 = root,
          lane = currentEventTransitionLane;
        root$jscomp$0.pendingLanes |= 2;
        root$jscomp$0.entangledLanes |= 2;
        root$jscomp$0.entanglements[1] |= lane;
      }
      root$jscomp$0 = scheduleTaskForRootDuringMicrotask(root, currentTime);
      0 === root$jscomp$0
        ? ((root.next = null),
          null === prev ? (firstScheduledRoot = next) : (prev.next = next),
          null === next && (lastScheduledRoot = prev))
        : ((prev = root),
          0 !== (root$jscomp$0 & 3) && (mightHavePendingSyncWork = !0));
      root = next;
    }
    currentEventTransitionLane = 0;
    flushSyncWorkAcrossRoots_impl(!1);
  }
  function scheduleTaskForRootDuringMicrotask(root, currentTime) {
    for (
      var suspendedLanes = root.suspendedLanes,
        pingedLanes = root.pingedLanes,
        expirationTimes = root.expirationTimes,
        lanes = root.pendingLanes & -62914561;
      0 < lanes;

    ) {
      var index$4 = 31 - clz32(lanes),
        lane = 1 << index$4,
        expirationTime = expirationTimes[index$4];
      if (-1 === expirationTime) {
        if (0 === (lane & suspendedLanes) || 0 !== (lane & pingedLanes))
          expirationTimes[index$4] = computeExpirationTime(lane, currentTime);
      } else expirationTime <= currentTime && (root.expiredLanes |= lane);
      lanes &= ~lane;
    }
    currentTime = workInProgressRoot;
    suspendedLanes = workInProgressRootRenderLanes;
    suspendedLanes = getNextLanes(
      root,
      root === currentTime ? suspendedLanes : 0
    );
    pingedLanes = root.callbackNode;
    if (
      0 === suspendedLanes ||
      (root === currentTime && 2 === workInProgressSuspendedReason) ||
      null !== root.cancelPendingCommit
    )
      return (
        null !== pingedLanes &&
          null !== pingedLanes &&
          cancelCallback$1(pingedLanes),
        (root.callbackNode = null),
        (root.callbackPriority = 0)
      );
    if (0 !== (suspendedLanes & 3))
      return (
        null !== pingedLanes &&
          null !== pingedLanes &&
          cancelCallback$1(pingedLanes),
        (root.callbackPriority = 2),
        (root.callbackNode = null),
        2
      );
    currentTime = suspendedLanes & -suspendedLanes;
    if (currentTime === root.callbackPriority) return currentTime;
    null !== pingedLanes && cancelCallback$1(pingedLanes);
    switch (lanesToEventPriority(suspendedLanes)) {
      case 2:
        suspendedLanes = ImmediatePriority;
        break;
      case 8:
        suspendedLanes = UserBlockingPriority;
        break;
      case 32:
        suspendedLanes = NormalPriority$1;
        break;
      case 268435456:
        suspendedLanes = IdlePriority;
        break;
      default:
        suspendedLanes = NormalPriority$1;
    }
    pingedLanes = performConcurrentWorkOnRoot.bind(null, root);
    suspendedLanes = scheduleCallback$3(suspendedLanes, pingedLanes);
    root.callbackPriority = currentTime;
    root.callbackNode = suspendedLanes;
    return currentTime;
  }
  function scheduleImmediateTask(cb) {
    supportsMicrotasks
      ? scheduleMicrotask(function () {
          0 !== (executionContext & 6)
            ? scheduleCallback$3(ImmediatePriority, cb)
            : cb();
        })
      : scheduleCallback$3(ImmediatePriority, cb);
  }
  function requestTransitionLane() {
    0 === currentEventTransitionLane &&
      (currentEventTransitionLane = claimNextTransitionLane());
    return currentEventTransitionLane;
  }
  function entangleAsyncAction(transition, thenable) {
    if (null === currentEntangledListeners) {
      var entangledListeners = (currentEntangledListeners = []);
      currentEntangledPendingCount = 0;
      currentEntangledLane = requestTransitionLane();
      currentEntangledActionThenable = {
        status: "pending",
        value: void 0,
        then: function (resolve) {
          entangledListeners.push(resolve);
        }
      };
    }
    currentEntangledPendingCount++;
    thenable.then(pingEngtangledActionScope, pingEngtangledActionScope);
    return thenable;
  }
  function pingEngtangledActionScope() {
    if (
      null !== currentEntangledListeners &&
      0 === --currentEntangledPendingCount
    ) {
      null !== currentEntangledActionThenable &&
        (currentEntangledActionThenable.status = "fulfilled");
      var listeners = currentEntangledListeners;
      currentEntangledListeners = null;
      currentEntangledLane = 0;
      currentEntangledActionThenable = null;
      for (var i = 0; i < listeners.length; i++) (0, listeners[i])();
    }
  }
  function chainThenableValue(thenable, result) {
    var listeners = [],
      thenableWithOverride = {
        status: "pending",
        value: null,
        reason: null,
        then: function (resolve) {
          listeners.push(resolve);
        }
      };
    thenable.then(
      function () {
        thenableWithOverride.status = "fulfilled";
        thenableWithOverride.value = result;
        for (var i = 0; i < listeners.length; i++) (0, listeners[i])(result);
      },
      function (error) {
        thenableWithOverride.status = "rejected";
        thenableWithOverride.reason = error;
        for (error = 0; error < listeners.length; error++)
          (0, listeners[error])(void 0);
      }
    );
    return thenableWithOverride;
  }
  function initializeUpdateQueue(fiber) {
    fiber.updateQueue = {
      baseState: fiber.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function cloneUpdateQueue(current, workInProgress) {
    current = current.updateQueue;
    workInProgress.updateQueue === current &&
      (workInProgress.updateQueue = {
        baseState: current.baseState,
        firstBaseUpdate: current.firstBaseUpdate,
        lastBaseUpdate: current.lastBaseUpdate,
        shared: current.shared,
        callbacks: null
      });
  }
  function createUpdate(lane) {
    return { lane: lane, tag: 0, payload: null, callback: null, next: null };
  }
  function enqueueUpdate(fiber, update, lane) {
    var updateQueue = fiber.updateQueue;
    if (null === updateQueue) return null;
    updateQueue = updateQueue.shared;
    if (0 !== (executionContext & 2)) {
      var pending = updateQueue.pending;
      null === pending
        ? (update.next = update)
        : ((update.next = pending.next), (pending.next = update));
      updateQueue.pending = update;
      update = getRootForUpdatedFiber(fiber);
      markUpdateLaneFromFiberToRoot(fiber, null, lane);
      return update;
    }
    enqueueUpdate$1(fiber, updateQueue, update, lane);
    return getRootForUpdatedFiber(fiber);
  }
  function entangleTransitions(root, fiber, lane) {
    fiber = fiber.updateQueue;
    if (null !== fiber && ((fiber = fiber.shared), 0 !== (lane & 4194176))) {
      var queueLanes = fiber.lanes;
      queueLanes &= root.pendingLanes;
      lane |= queueLanes;
      fiber.lanes = lane;
      markRootEntangled(root, lane);
    }
  }
  function enqueueCapturedUpdate(workInProgress, capturedUpdate) {
    var queue = workInProgress.updateQueue,
      current = workInProgress.alternate;
    if (
      null !== current &&
      ((current = current.updateQueue), queue === current)
    ) {
      var newFirst = null,
        newLast = null;
      queue = queue.firstBaseUpdate;
      if (null !== queue) {
        do {
          var clone = {
            lane: queue.lane,
            tag: queue.tag,
            payload: queue.payload,
            callback: null,
            next: null
          };
          null === newLast
            ? (newFirst = newLast = clone)
            : (newLast = newLast.next = clone);
          queue = queue.next;
        } while (null !== queue);
        null === newLast
          ? (newFirst = newLast = capturedUpdate)
          : (newLast = newLast.next = capturedUpdate);
      } else newFirst = newLast = capturedUpdate;
      queue = {
        baseState: current.baseState,
        firstBaseUpdate: newFirst,
        lastBaseUpdate: newLast,
        shared: current.shared,
        callbacks: current.callbacks
      };
      workInProgress.updateQueue = queue;
      return;
    }
    workInProgress = queue.lastBaseUpdate;
    null === workInProgress
      ? (queue.firstBaseUpdate = capturedUpdate)
      : (workInProgress.next = capturedUpdate);
    queue.lastBaseUpdate = capturedUpdate;
  }
  function suspendIfUpdateReadFromEntangledAsyncAction() {
    if (didReadFromEntangledAsyncAction) {
      var entangledActionThenable = currentEntangledActionThenable;
      if (null !== entangledActionThenable) throw entangledActionThenable;
    }
  }
  function processUpdateQueue(
    workInProgress$jscomp$0,
    props,
    instance$jscomp$0,
    renderLanes
  ) {
    didReadFromEntangledAsyncAction = !1;
    var queue = workInProgress$jscomp$0.updateQueue;
    hasForceUpdate = !1;
    var firstBaseUpdate = queue.firstBaseUpdate,
      lastBaseUpdate = queue.lastBaseUpdate,
      pendingQueue = queue.shared.pending;
    if (null !== pendingQueue) {
      queue.shared.pending = null;
      var lastPendingUpdate = pendingQueue,
        firstPendingUpdate = lastPendingUpdate.next;
      lastPendingUpdate.next = null;
      null === lastBaseUpdate
        ? (firstBaseUpdate = firstPendingUpdate)
        : (lastBaseUpdate.next = firstPendingUpdate);
      lastBaseUpdate = lastPendingUpdate;
      var current = workInProgress$jscomp$0.alternate;
      null !== current &&
        ((current = current.updateQueue),
        (pendingQueue = current.lastBaseUpdate),
        pendingQueue !== lastBaseUpdate &&
          (null === pendingQueue
            ? (current.firstBaseUpdate = firstPendingUpdate)
            : (pendingQueue.next = firstPendingUpdate),
          (current.lastBaseUpdate = lastPendingUpdate)));
    }
    if (null !== firstBaseUpdate) {
      var newState = queue.baseState;
      lastBaseUpdate = 0;
      current = firstPendingUpdate = lastPendingUpdate = null;
      pendingQueue = firstBaseUpdate;
      do {
        var updateLane = pendingQueue.lane & -536870913,
          isHiddenUpdate = updateLane !== pendingQueue.lane;
        if (
          isHiddenUpdate
            ? (workInProgressRootRenderLanes & updateLane) === updateLane
            : (renderLanes & updateLane) === updateLane
        ) {
          0 !== updateLane &&
            updateLane === currentEntangledLane &&
            (didReadFromEntangledAsyncAction = !0);
          null !== current &&
            (current = current.next =
              {
                lane: 0,
                tag: pendingQueue.tag,
                payload: pendingQueue.payload,
                callback: null,
                next: null
              });
          a: {
            var workInProgress = workInProgress$jscomp$0,
              update = pendingQueue;
            updateLane = props;
            var instance = instance$jscomp$0;
            switch (update.tag) {
              case 1:
                workInProgress = update.payload;
                if ("function" === typeof workInProgress) {
                  newState = workInProgress.call(
                    instance,
                    newState,
                    updateLane
                  );
                  break a;
                }
                newState = workInProgress;
                break a;
              case 3:
                workInProgress.flags = (workInProgress.flags & -65537) | 128;
              case 0:
                workInProgress = update.payload;
                updateLane =
                  "function" === typeof workInProgress
                    ? workInProgress.call(instance, newState, updateLane)
                    : workInProgress;
                if (null === updateLane || void 0 === updateLane) break a;
                newState = assign({}, newState, updateLane);
                break a;
              case 2:
                hasForceUpdate = !0;
            }
          }
          updateLane = pendingQueue.callback;
          null !== updateLane &&
            ((workInProgress$jscomp$0.flags |= 64),
            isHiddenUpdate && (workInProgress$jscomp$0.flags |= 8192),
            (isHiddenUpdate = queue.callbacks),
            null === isHiddenUpdate
              ? (queue.callbacks = [updateLane])
              : isHiddenUpdate.push(updateLane));
        } else
          (isHiddenUpdate = {
            lane: updateLane,
            tag: pendingQueue.tag,
            payload: pendingQueue.payload,
            callback: pendingQueue.callback,
            next: null
          }),
            null === current
              ? ((firstPendingUpdate = current = isHiddenUpdate),
                (lastPendingUpdate = newState))
              : (current = current.next = isHiddenUpdate),
            (lastBaseUpdate |= updateLane);
        pendingQueue = pendingQueue.next;
        if (null === pendingQueue)
          if (((pendingQueue = queue.shared.pending), null === pendingQueue))
            break;
          else
            (isHiddenUpdate = pendingQueue),
              (pendingQueue = isHiddenUpdate.next),
              (isHiddenUpdate.next = null),
              (queue.lastBaseUpdate = isHiddenUpdate),
              (queue.shared.pending = null);
      } while (1);
      null === current && (lastPendingUpdate = newState);
      queue.baseState = lastPendingUpdate;
      queue.firstBaseUpdate = firstPendingUpdate;
      queue.lastBaseUpdate = current;
      null === firstBaseUpdate && (queue.shared.lanes = 0);
      workInProgressRootSkippedLanes |= lastBaseUpdate;
      workInProgress$jscomp$0.lanes = lastBaseUpdate;
      workInProgress$jscomp$0.memoizedState = newState;
    }
  }
  function callCallback(callback, context) {
    if ("function" !== typeof callback)
      throw Error(formatProdErrorMessage(191, callback));
    callback.call(context);
  }
  function commitCallbacks(updateQueue, context) {
    var callbacks = updateQueue.callbacks;
    if (null !== callbacks)
      for (
        updateQueue.callbacks = null, updateQueue = 0;
        updateQueue < callbacks.length;
        updateQueue++
      )
        callCallback(callbacks[updateQueue], context);
  }
  function shallowEqual(objA, objB) {
    if (objectIs(objA, objB)) return !0;
    if (
      "object" !== typeof objA ||
      null === objA ||
      "object" !== typeof objB ||
      null === objB
    )
      return !1;
    var keysA = Object.keys(objA),
      keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return !1;
    for (keysB = 0; keysB < keysA.length; keysB++) {
      var currentKey = keysA[keysB];
      if (
        !hasOwnProperty.call(objB, currentKey) ||
        !objectIs(objA[currentKey], objB[currentKey])
      )
        return !1;
    }
    return !0;
  }
  function isThenableResolved(thenable) {
    thenable = thenable.status;
    return "fulfilled" === thenable || "rejected" === thenable;
  }
  function noop$1() {}
  function trackUsedThenable(thenableState, thenable, index) {
    index = thenableState[index];
    void 0 === index
      ? thenableState.push(thenable)
      : index !== thenable &&
        (thenable.then(noop$1, noop$1), (thenable = index));
    switch (thenable.status) {
      case "fulfilled":
        return thenable.value;
      case "rejected":
        thenableState = thenable.reason;
        if (thenableState === SuspenseException)
          throw Error(formatProdErrorMessage(483));
        throw thenableState;
      default:
        if ("string" === typeof thenable.status) thenable.then(noop$1, noop$1);
        else {
          thenableState = workInProgressRoot;
          if (null !== thenableState && 100 < thenableState.shellSuspendCounter)
            throw Error(formatProdErrorMessage(482));
          thenableState = thenable;
          thenableState.status = "pending";
          thenableState.then(
            function (fulfilledValue) {
              if ("pending" === thenable.status) {
                var fulfilledThenable = thenable;
                fulfilledThenable.status = "fulfilled";
                fulfilledThenable.value = fulfilledValue;
              }
            },
            function (error) {
              if ("pending" === thenable.status) {
                var rejectedThenable = thenable;
                rejectedThenable.status = "rejected";
                rejectedThenable.reason = error;
              }
            }
          );
        }
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            thenableState = thenable.reason;
            if (thenableState === SuspenseException)
              throw Error(formatProdErrorMessage(483));
            throw thenableState;
        }
        suspendedThenable = thenable;
        throw SuspenseException;
    }
  }
  function getSuspendedThenable() {
    if (null === suspendedThenable) throw Error(formatProdErrorMessage(459));
    var thenable = suspendedThenable;
    suspendedThenable = null;
    return thenable;
  }
  function unwrapThenable(thenable) {
    var index = thenableIndexCounter$1;
    thenableIndexCounter$1 += 1;
    null === thenableState$1 && (thenableState$1 = []);
    return trackUsedThenable(thenableState$1, thenable, index);
  }
  function coerceRef(returnFiber, current, workInProgress, element) {
    returnFiber = element.props.ref;
    workInProgress.ref = void 0 !== returnFiber ? returnFiber : null;
  }
  function throwOnInvalidObjectType(returnFiber, newChild) {
    if (newChild.$$typeof === REACT_LEGACY_ELEMENT_TYPE)
      throw Error(formatProdErrorMessage(525));
    returnFiber = Object.prototype.toString.call(newChild);
    throw Error(
      formatProdErrorMessage(
        31,
        "[object Object]" === returnFiber
          ? "object with keys {" + Object.keys(newChild).join(", ") + "}"
          : returnFiber
      )
    );
  }
  function resolveLazy(lazyType) {
    var init = lazyType._init;
    return init(lazyType._payload);
  }
  function createChildReconciler(shouldTrackSideEffects) {
    function deleteChild(returnFiber, childToDelete) {
      if (shouldTrackSideEffects) {
        var deletions = returnFiber.deletions;
        null === deletions
          ? ((returnFiber.deletions = [childToDelete]),
            (returnFiber.flags |= 16))
          : deletions.push(childToDelete);
      }
    }
    function deleteRemainingChildren(returnFiber, currentFirstChild) {
      if (!shouldTrackSideEffects) return null;
      for (; null !== currentFirstChild; )
        deleteChild(returnFiber, currentFirstChild),
          (currentFirstChild = currentFirstChild.sibling);
      return null;
    }
    function mapRemainingChildren(currentFirstChild) {
      for (var existingChildren = new Map(); null !== currentFirstChild; )
        null !== currentFirstChild.key
          ? existingChildren.set(currentFirstChild.key, currentFirstChild)
          : existingChildren.set(currentFirstChild.index, currentFirstChild),
          (currentFirstChild = currentFirstChild.sibling);
      return existingChildren;
    }
    function useFiber(fiber, pendingProps) {
      fiber = createWorkInProgress(fiber, pendingProps);
      fiber.index = 0;
      fiber.sibling = null;
      return fiber;
    }
    function placeChild(newFiber, lastPlacedIndex, newIndex) {
      newFiber.index = newIndex;
      if (!shouldTrackSideEffects)
        return (newFiber.flags |= 1048576), lastPlacedIndex;
      newIndex = newFiber.alternate;
      if (null !== newIndex)
        return (
          (newIndex = newIndex.index),
          newIndex < lastPlacedIndex
            ? ((newFiber.flags |= 33554434), lastPlacedIndex)
            : newIndex
        );
      newFiber.flags |= 33554434;
      return lastPlacedIndex;
    }
    function placeSingleChild(newFiber) {
      shouldTrackSideEffects &&
        null === newFiber.alternate &&
        (newFiber.flags |= 33554434);
      return newFiber;
    }
    function updateTextNode(returnFiber, current, textContent, lanes) {
      if (null === current || 6 !== current.tag)
        return (
          (current = createFiberFromText(textContent, returnFiber.mode, lanes)),
          (current.return = returnFiber),
          current
        );
      current = useFiber(current, textContent);
      current.return = returnFiber;
      return current;
    }
    function updateElement(returnFiber, current, element, lanes) {
      var elementType = element.type;
      if (elementType === REACT_FRAGMENT_TYPE)
        return updateFragment(
          returnFiber,
          current,
          element.props.children,
          lanes,
          element.key
        );
      if (
        null !== current &&
        (current.elementType === elementType ||
          ("object" === typeof elementType &&
            null !== elementType &&
            elementType.$$typeof === REACT_LAZY_TYPE &&
            resolveLazy(elementType) === current.type))
      )
        return (
          (lanes = useFiber(current, element.props)),
          coerceRef(returnFiber, current, lanes, element),
          (lanes.return = returnFiber),
          lanes
        );
      lanes = createFiberFromTypeAndProps(
        element.type,
        element.key,
        element.props,
        null,
        returnFiber.mode,
        lanes
      );
      coerceRef(returnFiber, current, lanes, element);
      lanes.return = returnFiber;
      return lanes;
    }
    function updatePortal(returnFiber, current, portal, lanes) {
      if (
        null === current ||
        4 !== current.tag ||
        current.stateNode.containerInfo !== portal.containerInfo ||
        current.stateNode.implementation !== portal.implementation
      )
        return (
          (current = createFiberFromPortal(portal, returnFiber.mode, lanes)),
          (current.return = returnFiber),
          current
        );
      current = useFiber(current, portal.children || []);
      current.return = returnFiber;
      return current;
    }
    function updateFragment(returnFiber, current, fragment, lanes, key) {
      if (null === current || 7 !== current.tag)
        return (
          (current = createFiberFromFragment(
            fragment,
            returnFiber.mode,
            lanes,
            key
          )),
          (current.return = returnFiber),
          current
        );
      current = useFiber(current, fragment);
      current.return = returnFiber;
      return current;
    }
    function createChild(returnFiber, newChild, lanes) {
      if (
        ("string" === typeof newChild && "" !== newChild) ||
        "number" === typeof newChild ||
        "bigint" === typeof newChild
      )
        return (
          (newChild = createFiberFromText(
            "" + newChild,
            returnFiber.mode,
            lanes
          )),
          (newChild.return = returnFiber),
          newChild
        );
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return (
              (lanes = createFiberFromTypeAndProps(
                newChild.type,
                newChild.key,
                newChild.props,
                null,
                returnFiber.mode,
                lanes
              )),
              coerceRef(returnFiber, null, lanes, newChild),
              (lanes.return = returnFiber),
              lanes
            );
          case REACT_PORTAL_TYPE:
            return (
              (newChild = createFiberFromPortal(
                newChild,
                returnFiber.mode,
                lanes
              )),
              (newChild.return = returnFiber),
              newChild
            );
          case REACT_LAZY_TYPE:
            var init = newChild._init;
            newChild = init(newChild._payload);
            return createChild(returnFiber, newChild, lanes);
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return (
            (newChild = createFiberFromFragment(
              newChild,
              returnFiber.mode,
              lanes,
              null
            )),
            (newChild.return = returnFiber),
            newChild
          );
        if ("function" === typeof newChild.then)
          return createChild(returnFiber, unwrapThenable(newChild), lanes);
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return createChild(
            returnFiber,
            readContextDuringReconciliation(returnFiber, newChild, lanes),
            lanes
          );
        throwOnInvalidObjectType(returnFiber, newChild);
      }
      return null;
    }
    function updateSlot(returnFiber, oldFiber, newChild, lanes) {
      var key = null !== oldFiber ? oldFiber.key : null;
      if (
        ("string" === typeof newChild && "" !== newChild) ||
        "number" === typeof newChild ||
        "bigint" === typeof newChild
      )
        return null !== key
          ? null
          : updateTextNode(returnFiber, oldFiber, "" + newChild, lanes);
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return newChild.key === key
              ? updateElement(returnFiber, oldFiber, newChild, lanes)
              : null;
          case REACT_PORTAL_TYPE:
            return newChild.key === key
              ? updatePortal(returnFiber, oldFiber, newChild, lanes)
              : null;
          case REACT_LAZY_TYPE:
            return (
              (key = newChild._init),
              (newChild = key(newChild._payload)),
              updateSlot(returnFiber, oldFiber, newChild, lanes)
            );
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return null !== key
            ? null
            : updateFragment(returnFiber, oldFiber, newChild, lanes, null);
        if ("function" === typeof newChild.then)
          return updateSlot(
            returnFiber,
            oldFiber,
            unwrapThenable(newChild),
            lanes
          );
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return updateSlot(
            returnFiber,
            oldFiber,
            readContextDuringReconciliation(returnFiber, newChild, lanes),
            lanes
          );
        throwOnInvalidObjectType(returnFiber, newChild);
      }
      return null;
    }
    function updateFromMap(
      existingChildren,
      returnFiber,
      newIdx,
      newChild,
      lanes
    ) {
      if (
        ("string" === typeof newChild && "" !== newChild) ||
        "number" === typeof newChild ||
        "bigint" === typeof newChild
      )
        return (
          (existingChildren = existingChildren.get(newIdx) || null),
          updateTextNode(returnFiber, existingChildren, "" + newChild, lanes)
        );
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return (
              (existingChildren =
                existingChildren.get(
                  null === newChild.key ? newIdx : newChild.key
                ) || null),
              updateElement(returnFiber, existingChildren, newChild, lanes)
            );
          case REACT_PORTAL_TYPE:
            return (
              (existingChildren =
                existingChildren.get(
                  null === newChild.key ? newIdx : newChild.key
                ) || null),
              updatePortal(returnFiber, existingChildren, newChild, lanes)
            );
          case REACT_LAZY_TYPE:
            var init = newChild._init;
            newChild = init(newChild._payload);
            return updateFromMap(
              existingChildren,
              returnFiber,
              newIdx,
              newChild,
              lanes
            );
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return (
            (existingChildren = existingChildren.get(newIdx) || null),
            updateFragment(returnFiber, existingChildren, newChild, lanes, null)
          );
        if ("function" === typeof newChild.then)
          return updateFromMap(
            existingChildren,
            returnFiber,
            newIdx,
            unwrapThenable(newChild),
            lanes
          );
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return updateFromMap(
            existingChildren,
            returnFiber,
            newIdx,
            readContextDuringReconciliation(returnFiber, newChild, lanes),
            lanes
          );
        throwOnInvalidObjectType(returnFiber, newChild);
      }
      return null;
    }
    function reconcileChildrenArray(
      returnFiber,
      currentFirstChild,
      newChildren,
      lanes
    ) {
      for (
        var resultingFirstChild = null,
          previousNewFiber = null,
          oldFiber = currentFirstChild,
          newIdx = (currentFirstChild = 0),
          nextOldFiber = null;
        null !== oldFiber && newIdx < newChildren.length;
        newIdx++
      ) {
        oldFiber.index > newIdx
          ? ((nextOldFiber = oldFiber), (oldFiber = null))
          : (nextOldFiber = oldFiber.sibling);
        var newFiber = updateSlot(
          returnFiber,
          oldFiber,
          newChildren[newIdx],
          lanes
        );
        if (null === newFiber) {
          null === oldFiber && (oldFiber = nextOldFiber);
          break;
        }
        shouldTrackSideEffects &&
          oldFiber &&
          null === newFiber.alternate &&
          deleteChild(returnFiber, oldFiber);
        currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
        null === previousNewFiber
          ? (resultingFirstChild = newFiber)
          : (previousNewFiber.sibling = newFiber);
        previousNewFiber = newFiber;
        oldFiber = nextOldFiber;
      }
      if (newIdx === newChildren.length)
        return (
          deleteRemainingChildren(returnFiber, oldFiber),
          isHydrating && pushTreeFork(returnFiber, newIdx),
          resultingFirstChild
        );
      if (null === oldFiber) {
        for (; newIdx < newChildren.length; newIdx++)
          (oldFiber = createChild(returnFiber, newChildren[newIdx], lanes)),
            null !== oldFiber &&
              ((currentFirstChild = placeChild(
                oldFiber,
                currentFirstChild,
                newIdx
              )),
              null === previousNewFiber
                ? (resultingFirstChild = oldFiber)
                : (previousNewFiber.sibling = oldFiber),
              (previousNewFiber = oldFiber));
        isHydrating && pushTreeFork(returnFiber, newIdx);
        return resultingFirstChild;
      }
      for (
        oldFiber = mapRemainingChildren(oldFiber);
        newIdx < newChildren.length;
        newIdx++
      )
        (nextOldFiber = updateFromMap(
          oldFiber,
          returnFiber,
          newIdx,
          newChildren[newIdx],
          lanes
        )),
          null !== nextOldFiber &&
            (shouldTrackSideEffects &&
              null !== nextOldFiber.alternate &&
              oldFiber.delete(
                null === nextOldFiber.key ? newIdx : nextOldFiber.key
              ),
            (currentFirstChild = placeChild(
              nextOldFiber,
              currentFirstChild,
              newIdx
            )),
            null === previousNewFiber
              ? (resultingFirstChild = nextOldFiber)
              : (previousNewFiber.sibling = nextOldFiber),
            (previousNewFiber = nextOldFiber));
      shouldTrackSideEffects &&
        oldFiber.forEach(function (child) {
          return deleteChild(returnFiber, child);
        });
      isHydrating && pushTreeFork(returnFiber, newIdx);
      return resultingFirstChild;
    }
    function reconcileChildrenIterator(
      returnFiber,
      currentFirstChild,
      newChildren,
      lanes
    ) {
      if (null == newChildren) throw Error(formatProdErrorMessage(151));
      for (
        var resultingFirstChild = null,
          previousNewFiber = null,
          oldFiber = currentFirstChild,
          newIdx = (currentFirstChild = 0),
          nextOldFiber = null,
          step = newChildren.next();
        null !== oldFiber && !step.done;
        newIdx++, step = newChildren.next()
      ) {
        oldFiber.index > newIdx
          ? ((nextOldFiber = oldFiber), (oldFiber = null))
          : (nextOldFiber = oldFiber.sibling);
        var newFiber = updateSlot(returnFiber, oldFiber, step.value, lanes);
        if (null === newFiber) {
          null === oldFiber && (oldFiber = nextOldFiber);
          break;
        }
        shouldTrackSideEffects &&
          oldFiber &&
          null === newFiber.alternate &&
          deleteChild(returnFiber, oldFiber);
        currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
        null === previousNewFiber
          ? (resultingFirstChild = newFiber)
          : (previousNewFiber.sibling = newFiber);
        previousNewFiber = newFiber;
        oldFiber = nextOldFiber;
      }
      if (step.done)
        return (
          deleteRemainingChildren(returnFiber, oldFiber),
          isHydrating && pushTreeFork(returnFiber, newIdx),
          resultingFirstChild
        );
      if (null === oldFiber) {
        for (; !step.done; newIdx++, step = newChildren.next())
          (step = createChild(returnFiber, step.value, lanes)),
            null !== step &&
              ((currentFirstChild = placeChild(
                step,
                currentFirstChild,
                newIdx
              )),
              null === previousNewFiber
                ? (resultingFirstChild = step)
                : (previousNewFiber.sibling = step),
              (previousNewFiber = step));
        isHydrating && pushTreeFork(returnFiber, newIdx);
        return resultingFirstChild;
      }
      for (
        oldFiber = mapRemainingChildren(oldFiber);
        !step.done;
        newIdx++, step = newChildren.next()
      )
        (step = updateFromMap(
          oldFiber,
          returnFiber,
          newIdx,
          step.value,
          lanes
        )),
          null !== step &&
            (shouldTrackSideEffects &&
              null !== step.alternate &&
              oldFiber.delete(null === step.key ? newIdx : step.key),
            (currentFirstChild = placeChild(step, currentFirstChild, newIdx)),
            null === previousNewFiber
              ? (resultingFirstChild = step)
              : (previousNewFiber.sibling = step),
            (previousNewFiber = step));
      shouldTrackSideEffects &&
        oldFiber.forEach(function (child) {
          return deleteChild(returnFiber, child);
        });
      isHydrating && pushTreeFork(returnFiber, newIdx);
      return resultingFirstChild;
    }
    function reconcileChildFibersImpl(
      returnFiber,
      currentFirstChild,
      newChild,
      lanes
    ) {
      "object" === typeof newChild &&
        null !== newChild &&
        newChild.type === REACT_FRAGMENT_TYPE &&
        null === newChild.key &&
        (newChild = newChild.props.children);
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            a: {
              for (
                var key = newChild.key, child = currentFirstChild;
                null !== child;

              ) {
                if (child.key === key) {
                  key = newChild.type;
                  if (key === REACT_FRAGMENT_TYPE) {
                    if (7 === child.tag) {
                      deleteRemainingChildren(returnFiber, child.sibling);
                      currentFirstChild = useFiber(
                        child,
                        newChild.props.children
                      );
                      currentFirstChild.return = returnFiber;
                      returnFiber = currentFirstChild;
                      break a;
                    }
                  } else if (
                    child.elementType === key ||
                    ("object" === typeof key &&
                      null !== key &&
                      key.$$typeof === REACT_LAZY_TYPE &&
                      resolveLazy(key) === child.type)
                  ) {
                    deleteRemainingChildren(returnFiber, child.sibling);
                    currentFirstChild = useFiber(child, newChild.props);
                    coerceRef(returnFiber, child, currentFirstChild, newChild);
                    currentFirstChild.return = returnFiber;
                    returnFiber = currentFirstChild;
                    break a;
                  }
                  deleteRemainingChildren(returnFiber, child);
                  break;
                } else deleteChild(returnFiber, child);
                child = child.sibling;
              }
              newChild.type === REACT_FRAGMENT_TYPE
                ? ((currentFirstChild = createFiberFromFragment(
                    newChild.props.children,
                    returnFiber.mode,
                    lanes,
                    newChild.key
                  )),
                  (currentFirstChild.return = returnFiber),
                  (returnFiber = currentFirstChild))
                : ((lanes = createFiberFromTypeAndProps(
                    newChild.type,
                    newChild.key,
                    newChild.props,
                    null,
                    returnFiber.mode,
                    lanes
                  )),
                  coerceRef(returnFiber, currentFirstChild, lanes, newChild),
                  (lanes.return = returnFiber),
                  (returnFiber = lanes));
            }
            return placeSingleChild(returnFiber);
          case REACT_PORTAL_TYPE:
            a: {
              for (child = newChild.key; null !== currentFirstChild; ) {
                if (currentFirstChild.key === child)
                  if (
                    4 === currentFirstChild.tag &&
                    currentFirstChild.stateNode.containerInfo ===
                      newChild.containerInfo &&
                    currentFirstChild.stateNode.implementation ===
                      newChild.implementation
                  ) {
                    deleteRemainingChildren(
                      returnFiber,
                      currentFirstChild.sibling
                    );
                    currentFirstChild = useFiber(
                      currentFirstChild,
                      newChild.children || []
                    );
                    currentFirstChild.return = returnFiber;
                    returnFiber = currentFirstChild;
                    break a;
                  } else {
                    deleteRemainingChildren(returnFiber, currentFirstChild);
                    break;
                  }
                else deleteChild(returnFiber, currentFirstChild);
                currentFirstChild = currentFirstChild.sibling;
              }
              currentFirstChild = createFiberFromPortal(
                newChild,
                returnFiber.mode,
                lanes
              );
              currentFirstChild.return = returnFiber;
              returnFiber = currentFirstChild;
            }
            return placeSingleChild(returnFiber);
          case REACT_LAZY_TYPE:
            return (
              (child = newChild._init),
              (newChild = child(newChild._payload)),
              reconcileChildFibersImpl(
                returnFiber,
                currentFirstChild,
                newChild,
                lanes
              )
            );
        }
        if (isArrayImpl(newChild))
          return reconcileChildrenArray(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes
          );
        if (getIteratorFn(newChild)) {
          child = getIteratorFn(newChild);
          if ("function" !== typeof child)
            throw Error(formatProdErrorMessage(150));
          newChild = child.call(newChild);
          return reconcileChildrenIterator(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes
          );
        }
        if ("function" === typeof newChild.then)
          return reconcileChildFibersImpl(
            returnFiber,
            currentFirstChild,
            unwrapThenable(newChild),
            lanes
          );
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return reconcileChildFibersImpl(
            returnFiber,
            currentFirstChild,
            readContextDuringReconciliation(returnFiber, newChild, lanes),
            lanes
          );
        throwOnInvalidObjectType(returnFiber, newChild);
      }
      return ("string" === typeof newChild && "" !== newChild) ||
        "number" === typeof newChild ||
        "bigint" === typeof newChild
        ? ((newChild = "" + newChild),
          null !== currentFirstChild && 6 === currentFirstChild.tag
            ? (deleteRemainingChildren(returnFiber, currentFirstChild.sibling),
              (currentFirstChild = useFiber(currentFirstChild, newChild)),
              (currentFirstChild.return = returnFiber),
              (returnFiber = currentFirstChild))
            : (deleteRemainingChildren(returnFiber, currentFirstChild),
              (currentFirstChild = createFiberFromText(
                newChild,
                returnFiber.mode,
                lanes
              )),
              (currentFirstChild.return = returnFiber),
              (returnFiber = currentFirstChild)),
          placeSingleChild(returnFiber))
        : deleteRemainingChildren(returnFiber, currentFirstChild);
    }
    return function (returnFiber, currentFirstChild, newChild, lanes) {
      try {
        thenableIndexCounter$1 = 0;
        var firstChildFiber = reconcileChildFibersImpl(
          returnFiber,
          currentFirstChild,
          newChild,
          lanes
        );
        thenableState$1 = null;
        return firstChildFiber;
      } catch (x) {
        if (x === SuspenseException) throw x;
        var fiber = createFiber(29, x, null, returnFiber.mode);
        fiber.lanes = lanes;
        fiber.return = returnFiber;
        return fiber;
      } finally {
      }
    };
  }
  function pushHiddenContext(fiber, context) {
    fiber = entangledRenderLanes;
    push(prevEntangledRenderLanesCursor, fiber);
    push(currentTreeHiddenStackCursor, context);
    entangledRenderLanes = fiber | context.baseLanes;
  }
  function reuseHiddenContextOnStack() {
    push(prevEntangledRenderLanesCursor, entangledRenderLanes);
    push(currentTreeHiddenStackCursor, currentTreeHiddenStackCursor.current);
  }
  function popHiddenContext() {
    entangledRenderLanes = prevEntangledRenderLanesCursor.current;
    pop(currentTreeHiddenStackCursor);
    pop(prevEntangledRenderLanesCursor);
  }
  function pushPrimaryTreeSuspenseHandler(handler) {
    var current = handler.alternate;
    push(suspenseStackCursor, suspenseStackCursor.current & 1);
    push(suspenseHandlerStackCursor, handler);
    null === shellBoundary &&
      (null === current || null !== currentTreeHiddenStackCursor.current
        ? (shellBoundary = handler)
        : null !== current.memoizedState && (shellBoundary = handler));
  }
  function pushOffscreenSuspenseHandler(fiber) {
    if (22 === fiber.tag) {
      if (
        (push(suspenseStackCursor, suspenseStackCursor.current),
        push(suspenseHandlerStackCursor, fiber),
        null === shellBoundary)
      ) {
        var current = fiber.alternate;
        null !== current &&
          null !== current.memoizedState &&
          (shellBoundary = fiber);
      }
    } else reuseSuspenseHandlerOnStack(fiber);
  }
  function reuseSuspenseHandlerOnStack() {
    push(suspenseStackCursor, suspenseStackCursor.current);
    push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current);
  }
  function popSuspenseHandler(fiber) {
    pop(suspenseHandlerStackCursor);
    shellBoundary === fiber && (shellBoundary = null);
    pop(suspenseStackCursor);
  }
  function findFirstSuspended(row) {
    for (var node = row; null !== node; ) {
      if (13 === node.tag) {
        var state = node.memoizedState;
        if (
          null !== state &&
          ((state = state.dehydrated),
          null === state ||
            isSuspenseInstancePending(state) ||
            isSuspenseInstanceFallback(state))
        )
          return node;
      } else if (19 === node.tag && void 0 !== node.memoizedProps.revealOrder) {
        if (0 !== (node.flags & 128)) return node;
      } else if (null !== node.child) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      if (node === row) break;
      for (; null === node.sibling; ) {
        if (null === node.return || node.return === row) return null;
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
    return null;
  }
  function throwInvalidHookError() {
    throw Error(formatProdErrorMessage(321));
  }
  function areHookInputsEqual(nextDeps, prevDeps) {
    if (null === prevDeps) return !1;
    for (var i = 0; i < prevDeps.length && i < nextDeps.length; i++)
      if (!objectIs(nextDeps[i], prevDeps[i])) return !1;
    return !0;
  }
  function renderWithHooks(
    current,
    workInProgress,
    Component,
    props,
    secondArg,
    nextRenderLanes
  ) {
    renderLanes = nextRenderLanes;
    currentlyRenderingFiber$1 = workInProgress;
    workInProgress.memoizedState = null;
    workInProgress.updateQueue = null;
    workInProgress.lanes = 0;
    ReactSharedInternals.H =
      null === current || null === current.memoizedState
        ? HooksDispatcherOnMount
        : HooksDispatcherOnUpdate;
    shouldDoubleInvokeUserFnsInHooksDEV = !1;
    current = Component(props, secondArg);
    shouldDoubleInvokeUserFnsInHooksDEV = !1;
    didScheduleRenderPhaseUpdateDuringThisPass &&
      (current = renderWithHooksAgain(
        workInProgress,
        Component,
        props,
        secondArg
      ));
    finishRenderingHooks();
    return current;
  }
  function finishRenderingHooks() {
    ReactSharedInternals.H = ContextOnlyDispatcher;
    var didRenderTooFewHooks =
      null !== currentHook && null !== currentHook.next;
    renderLanes = 0;
    workInProgressHook = currentHook = currentlyRenderingFiber$1 = null;
    didScheduleRenderPhaseUpdate = !1;
    thenableIndexCounter = 0;
    thenableState = null;
    if (didRenderTooFewHooks) throw Error(formatProdErrorMessage(300));
  }
  function renderWithHooksAgain(workInProgress, Component, props, secondArg) {
    currentlyRenderingFiber$1 = workInProgress;
    var numberOfReRenders = 0;
    do {
      didScheduleRenderPhaseUpdateDuringThisPass && (thenableState = null);
      thenableIndexCounter = 0;
      didScheduleRenderPhaseUpdateDuringThisPass = !1;
      if (25 <= numberOfReRenders) throw Error(formatProdErrorMessage(301));
      numberOfReRenders += 1;
      workInProgressHook = currentHook = null;
      workInProgress.updateQueue = null;
      ReactSharedInternals.H = HooksDispatcherOnRerender;
      var children = Component(props, secondArg);
    } while (didScheduleRenderPhaseUpdateDuringThisPass);
    return children;
  }
  function TransitionAwareHostComponent() {
    var dispatcher = ReactSharedInternals.H,
      maybeThenable = dispatcher.useState()[0];
    maybeThenable =
      "function" === typeof maybeThenable.then
        ? useThenable(maybeThenable)
        : maybeThenable;
    dispatcher = dispatcher.useState()[0];
    (null !== currentHook ? currentHook.memoizedState : null) !== dispatcher &&
      (currentlyRenderingFiber$1.flags |= 1024);
    return maybeThenable;
  }
  function checkDidRenderIdHook() {
    var didRenderIdHook = 0 !== localIdCounter;
    localIdCounter = 0;
    return didRenderIdHook;
  }
  function bailoutHooks(current, workInProgress, lanes) {
    workInProgress.updateQueue = current.updateQueue;
    workInProgress.flags &= -2053;
    current.lanes &= ~lanes;
  }
  function resetHooksOnUnwind(workInProgress) {
    if (didScheduleRenderPhaseUpdate) {
      for (
        workInProgress = workInProgress.memoizedState;
        null !== workInProgress;

      ) {
        var queue = workInProgress.queue;
        null !== queue && (queue.pending = null);
        workInProgress = workInProgress.next;
      }
      didScheduleRenderPhaseUpdate = !1;
    }
    renderLanes = 0;
    workInProgressHook = currentHook = currentlyRenderingFiber$1 = null;
    didScheduleRenderPhaseUpdateDuringThisPass = !1;
    thenableIndexCounter = localIdCounter = 0;
    thenableState = null;
  }
  function mountWorkInProgressHook() {
    var hook = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    null === workInProgressHook
      ? (currentlyRenderingFiber$1.memoizedState = workInProgressHook = hook)
      : (workInProgressHook = workInProgressHook.next = hook);
    return workInProgressHook;
  }
  function updateWorkInProgressHook() {
    if (null === currentHook) {
      var nextCurrentHook = currentlyRenderingFiber$1.alternate;
      nextCurrentHook =
        null !== nextCurrentHook ? nextCurrentHook.memoizedState : null;
    } else nextCurrentHook = currentHook.next;
    var nextWorkInProgressHook =
      null === workInProgressHook
        ? currentlyRenderingFiber$1.memoizedState
        : workInProgressHook.next;
    if (null !== nextWorkInProgressHook)
      (workInProgressHook = nextWorkInProgressHook),
        (currentHook = nextCurrentHook);
    else {
      if (null === nextCurrentHook) {
        if (null === currentlyRenderingFiber$1.alternate)
          throw Error(formatProdErrorMessage(467));
        throw Error(formatProdErrorMessage(310));
      }
      currentHook = nextCurrentHook;
      nextCurrentHook = {
        memoizedState: currentHook.memoizedState,
        baseState: currentHook.baseState,
        baseQueue: currentHook.baseQueue,
        queue: currentHook.queue,
        next: null
      };
      null === workInProgressHook
        ? (currentlyRenderingFiber$1.memoizedState = workInProgressHook =
            nextCurrentHook)
        : (workInProgressHook = workInProgressHook.next = nextCurrentHook);
    }
    return workInProgressHook;
  }
  function useThenable(thenable) {
    var index = thenableIndexCounter;
    thenableIndexCounter += 1;
    null === thenableState && (thenableState = []);
    thenable = trackUsedThenable(thenableState, thenable, index);
    index = currentlyRenderingFiber$1;
    null ===
      (null === workInProgressHook
        ? index.memoizedState
        : workInProgressHook.next) &&
      ((index = index.alternate),
      (ReactSharedInternals.H =
        null === index || null === index.memoizedState
          ? HooksDispatcherOnMount
          : HooksDispatcherOnUpdate));
    return thenable;
  }
  function use(usable) {
    if (null !== usable && "object" === typeof usable) {
      if ("function" === typeof usable.then) return useThenable(usable);
      if (usable.$$typeof === REACT_CONTEXT_TYPE) return readContext(usable);
    }
    throw Error(formatProdErrorMessage(438, String(usable)));
  }
  function useMemoCache(size) {
    var memoCache = null,
      updateQueue = currentlyRenderingFiber$1.updateQueue;
    null !== updateQueue && (memoCache = updateQueue.memoCache);
    if (null == memoCache) {
      var current = currentlyRenderingFiber$1.alternate;
      null !== current &&
        ((current = current.updateQueue),
        null !== current &&
          ((current = current.memoCache),
          null != current &&
            (memoCache = {
              data: current.data.map(function (array) {
                return array.slice();
              }),
              index: 0
            })));
    }
    null == memoCache && (memoCache = { data: [], index: 0 });
    null === updateQueue &&
      ((updateQueue = createFunctionComponentUpdateQueue()),
      (currentlyRenderingFiber$1.updateQueue = updateQueue));
    updateQueue.memoCache = memoCache;
    updateQueue = memoCache.data[memoCache.index];
    if (void 0 === updateQueue)
      for (
        updateQueue = memoCache.data[memoCache.index] = Array(size),
          current = 0;
        current < size;
        current++
      )
        updateQueue[current] = REACT_MEMO_CACHE_SENTINEL;
    memoCache.index++;
    return updateQueue;
  }
  function basicStateReducer(state, action) {
    return "function" === typeof action ? action(state) : action;
  }
  function updateReducer(reducer) {
    var hook = updateWorkInProgressHook();
    return updateReducerImpl(hook, currentHook, reducer);
  }
  function updateReducerImpl(hook, current, reducer) {
    var queue = hook.queue;
    if (null === queue) throw Error(formatProdErrorMessage(311));
    queue.lastRenderedReducer = reducer;
    var baseQueue = hook.baseQueue,
      pendingQueue = queue.pending;
    if (null !== pendingQueue) {
      if (null !== baseQueue) {
        var baseFirst = baseQueue.next;
        baseQueue.next = pendingQueue.next;
        pendingQueue.next = baseFirst;
      }
      current.baseQueue = baseQueue = pendingQueue;
      queue.pending = null;
    }
    pendingQueue = hook.baseState;
    if (null === baseQueue) hook.memoizedState = pendingQueue;
    else {
      current = baseQueue.next;
      var newBaseQueueFirst = (baseFirst = null),
        newBaseQueueLast = null,
        update = current,
        didReadFromEntangledAsyncAction$49 = !1;
      do {
        var updateLane = update.lane & -536870913;
        if (
          updateLane !== update.lane
            ? (workInProgressRootRenderLanes & updateLane) === updateLane
            : (renderLanes & updateLane) === updateLane
        ) {
          var revertLane = update.revertLane;
          if (0 === revertLane)
            null !== newBaseQueueLast &&
              (newBaseQueueLast = newBaseQueueLast.next =
                {
                  lane: 0,
                  revertLane: 0,
                  action: update.action,
                  hasEagerState: update.hasEagerState,
                  eagerState: update.eagerState,
                  next: null
                }),
              updateLane === currentEntangledLane &&
                (didReadFromEntangledAsyncAction$49 = !0);
          else if ((renderLanes & revertLane) === revertLane) {
            update = update.next;
            revertLane === currentEntangledLane &&
              (didReadFromEntangledAsyncAction$49 = !0);
            continue;
          } else
            (updateLane = {
              lane: 0,
              revertLane: update.revertLane,
              action: update.action,
              hasEagerState: update.hasEagerState,
              eagerState: update.eagerState,
              next: null
            }),
              null === newBaseQueueLast
                ? ((newBaseQueueFirst = newBaseQueueLast = updateLane),
                  (baseFirst = pendingQueue))
                : (newBaseQueueLast = newBaseQueueLast.next = updateLane),
              (currentlyRenderingFiber$1.lanes |= revertLane),
              (workInProgressRootSkippedLanes |= revertLane);
          updateLane = update.action;
          shouldDoubleInvokeUserFnsInHooksDEV &&
            reducer(pendingQueue, updateLane);
          pendingQueue = update.hasEagerState
            ? update.eagerState
            : reducer(pendingQueue, updateLane);
        } else
          (revertLane = {
            lane: updateLane,
            revertLane: update.revertLane,
            action: update.action,
            hasEagerState: update.hasEagerState,
            eagerState: update.eagerState,
            next: null
          }),
            null === newBaseQueueLast
              ? ((newBaseQueueFirst = newBaseQueueLast = revertLane),
                (baseFirst = pendingQueue))
              : (newBaseQueueLast = newBaseQueueLast.next = revertLane),
            (currentlyRenderingFiber$1.lanes |= updateLane),
            (workInProgressRootSkippedLanes |= updateLane);
        update = update.next;
      } while (null !== update && update !== current);
      null === newBaseQueueLast
        ? (baseFirst = pendingQueue)
        : (newBaseQueueLast.next = newBaseQueueFirst);
      if (
        !objectIs(pendingQueue, hook.memoizedState) &&
        ((didReceiveUpdate = !0),
        didReadFromEntangledAsyncAction$49 &&
          ((reducer = currentEntangledActionThenable), null !== reducer))
      )
        throw reducer;
      hook.memoizedState = pendingQueue;
      hook.baseState = baseFirst;
      hook.baseQueue = newBaseQueueLast;
      queue.lastRenderedState = pendingQueue;
    }
    null === baseQueue && (queue.lanes = 0);
    return [hook.memoizedState, queue.dispatch];
  }
  function rerenderReducer(reducer) {
    var hook = updateWorkInProgressHook(),
      queue = hook.queue;
    if (null === queue) throw Error(formatProdErrorMessage(311));
    queue.lastRenderedReducer = reducer;
    var dispatch = queue.dispatch,
      lastRenderPhaseUpdate = queue.pending,
      newState = hook.memoizedState;
    if (null !== lastRenderPhaseUpdate) {
      queue.pending = null;
      var update = (lastRenderPhaseUpdate = lastRenderPhaseUpdate.next);
      do (newState = reducer(newState, update.action)), (update = update.next);
      while (update !== lastRenderPhaseUpdate);
      objectIs(newState, hook.memoizedState) || (didReceiveUpdate = !0);
      hook.memoizedState = newState;
      null === hook.baseQueue && (hook.baseState = newState);
      queue.lastRenderedState = newState;
    }
    return [newState, dispatch];
  }
  function updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
    var fiber = currentlyRenderingFiber$1,
      hook = updateWorkInProgressHook(),
      isHydrating$jscomp$0 = isHydrating;
    if (isHydrating$jscomp$0) {
      if (void 0 === getServerSnapshot)
        throw Error(formatProdErrorMessage(407));
      getServerSnapshot = getServerSnapshot();
    } else getServerSnapshot = getSnapshot();
    var snapshotChanged = !objectIs(
      (currentHook || hook).memoizedState,
      getServerSnapshot
    );
    snapshotChanged &&
      ((hook.memoizedState = getServerSnapshot), (didReceiveUpdate = !0));
    hook = hook.queue;
    updateEffect(subscribeToStore.bind(null, fiber, hook, subscribe), [
      subscribe
    ]);
    if (
      hook.getSnapshot !== getSnapshot ||
      snapshotChanged ||
      (null !== workInProgressHook && workInProgressHook.memoizedState.tag & 1)
    ) {
      fiber.flags |= 2048;
      pushEffect(
        9,
        updateStoreInstance.bind(
          null,
          fiber,
          hook,
          getServerSnapshot,
          getSnapshot
        ),
        { destroy: void 0 },
        null
      );
      if (null === workInProgressRoot) throw Error(formatProdErrorMessage(349));
      isHydrating$jscomp$0 ||
        0 !== (renderLanes & 60) ||
        pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
    }
    return getServerSnapshot;
  }
  function pushStoreConsistencyCheck(fiber, getSnapshot, renderedSnapshot) {
    fiber.flags |= 16384;
    fiber = { getSnapshot: getSnapshot, value: renderedSnapshot };
    getSnapshot = currentlyRenderingFiber$1.updateQueue;
    null === getSnapshot
      ? ((getSnapshot = createFunctionComponentUpdateQueue()),
        (currentlyRenderingFiber$1.updateQueue = getSnapshot),
        (getSnapshot.stores = [fiber]))
      : ((renderedSnapshot = getSnapshot.stores),
        null === renderedSnapshot
          ? (getSnapshot.stores = [fiber])
          : renderedSnapshot.push(fiber));
  }
  function updateStoreInstance(fiber, inst, nextSnapshot, getSnapshot) {
    inst.value = nextSnapshot;
    inst.getSnapshot = getSnapshot;
    checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
  }
  function subscribeToStore(fiber, inst, subscribe) {
    return subscribe(function () {
      checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
    });
  }
  function checkIfSnapshotChanged(inst) {
    var latestGetSnapshot = inst.getSnapshot;
    inst = inst.value;
    try {
      var nextValue = latestGetSnapshot();
      return !objectIs(inst, nextValue);
    } catch (error) {
      return !0;
    }
  }
  function forceStoreRerender(fiber) {
    var root = enqueueConcurrentRenderForLane(fiber, 2);
    null !== root && scheduleUpdateOnFiber(root, fiber, 2);
  }
  function mountStateImpl(initialState) {
    var hook = mountWorkInProgressHook();
    if ("function" === typeof initialState) {
      var initialStateInitializer = initialState;
      initialState = initialStateInitializer();
      shouldDoubleInvokeUserFnsInHooksDEV &&
        (setIsStrictModeForDevtools(!0),
        initialStateInitializer(),
        setIsStrictModeForDevtools(!1));
    }
    hook.memoizedState = hook.baseState = initialState;
    hook.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: basicStateReducer,
      lastRenderedState: initialState
    };
    return hook;
  }
  function updateOptimisticImpl(hook, current, passthrough, reducer) {
    hook.baseState = passthrough;
    return updateReducerImpl(
      hook,
      currentHook,
      "function" === typeof reducer ? reducer : basicStateReducer
    );
  }
  function dispatchActionState(
    fiber,
    actionQueue,
    setPendingState,
    setState,
    payload
  ) {
    if (isRenderPhaseUpdate(fiber)) throw Error(formatProdErrorMessage(485));
    fiber = actionQueue.action;
    if (null !== fiber) {
      var actionNode = {
        payload: payload,
        action: fiber,
        next: null,
        isTransition: !0,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function (listener) {
          actionNode.listeners.push(listener);
        }
      };
      null !== ReactSharedInternals.T
        ? setPendingState(!0)
        : (actionNode.isTransition = !1);
      setState(actionNode);
      setPendingState = actionQueue.pending;
      null === setPendingState
        ? ((actionNode.next = actionQueue.pending = actionNode),
          runActionStateAction(actionQueue, actionNode))
        : ((actionNode.next = setPendingState.next),
          (actionQueue.pending = setPendingState.next = actionNode));
    }
  }
  function runActionStateAction(actionQueue, node) {
    var action = node.action,
      payload = node.payload,
      prevState = actionQueue.state;
    if (node.isTransition) {
      var prevTransition = ReactSharedInternals.T,
        currentTransition = {};
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = action(prevState, payload),
          onStartTransitionFinish = ReactSharedInternals.S;
        null !== onStartTransitionFinish &&
          onStartTransitionFinish(currentTransition, returnValue);
        handleActionReturnValue(actionQueue, node, returnValue);
      } catch (error) {
        onActionError(actionQueue, node, error);
      } finally {
        ReactSharedInternals.T = prevTransition;
      }
    } else
      try {
        (prevTransition = action(prevState, payload)),
          handleActionReturnValue(actionQueue, node, prevTransition);
      } catch (error$53) {
        onActionError(actionQueue, node, error$53);
      }
  }
  function handleActionReturnValue(actionQueue, node, returnValue) {
    null !== returnValue &&
    "object" === typeof returnValue &&
    "function" === typeof returnValue.then
      ? returnValue.then(
          function (nextState) {
            onActionSuccess(actionQueue, node, nextState);
          },
          function (error) {
            return onActionError(actionQueue, node, error);
          }
        )
      : onActionSuccess(actionQueue, node, returnValue);
  }
  function onActionSuccess(actionQueue, actionNode, nextState) {
    actionNode.status = "fulfilled";
    actionNode.value = nextState;
    notifyActionListeners(actionNode);
    actionQueue.state = nextState;
    actionNode = actionQueue.pending;
    null !== actionNode &&
      ((nextState = actionNode.next),
      nextState === actionNode
        ? (actionQueue.pending = null)
        : ((nextState = nextState.next),
          (actionNode.next = nextState),
          runActionStateAction(actionQueue, nextState)));
  }
  function onActionError(actionQueue, actionNode, error) {
    var last = actionQueue.pending;
    actionQueue.pending = null;
    if (null !== last) {
      last = last.next;
      do
        (actionNode.status = "rejected"),
          (actionNode.reason = error),
          notifyActionListeners(actionNode),
          (actionNode = actionNode.next);
      while (actionNode !== last);
    }
    actionQueue.action = null;
  }
  function notifyActionListeners(actionNode) {
    actionNode = actionNode.listeners;
    for (var i = 0; i < actionNode.length; i++) (0, actionNode[i])();
  }
  function actionStateReducer(oldState, newState) {
    return newState;
  }
  function mountActionState(action, initialStateProp) {
    if (isHydrating) {
      var ssrFormState = workInProgressRoot.formState;
      if (null !== ssrFormState) {
        a: {
          var JSCompiler_inline_result = currentlyRenderingFiber$1;
          if (isHydrating) {
            if (nextHydratableInstance) {
              var markerInstance = canHydrateFormStateMarker(
                nextHydratableInstance,
                rootOrSingletonContext
              );
              if (markerInstance) {
                nextHydratableInstance =
                  getNextHydratableSibling(markerInstance);
                JSCompiler_inline_result =
                  isFormStateMarkerMatching(markerInstance);
                break a;
              }
            }
            throwOnHydrationMismatch(JSCompiler_inline_result);
          }
          JSCompiler_inline_result = !1;
        }
        JSCompiler_inline_result && (initialStateProp = ssrFormState[0]);
      }
    }
    ssrFormState = mountWorkInProgressHook();
    ssrFormState.memoizedState = ssrFormState.baseState = initialStateProp;
    JSCompiler_inline_result = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: actionStateReducer,
      lastRenderedState: initialStateProp
    };
    ssrFormState.queue = JSCompiler_inline_result;
    ssrFormState = dispatchSetState.bind(
      null,
      currentlyRenderingFiber$1,
      JSCompiler_inline_result
    );
    JSCompiler_inline_result.dispatch = ssrFormState;
    JSCompiler_inline_result = mountStateImpl(!1);
    var setPendingState = dispatchOptimisticSetState.bind(
      null,
      currentlyRenderingFiber$1,
      !1,
      JSCompiler_inline_result.queue
    );
    JSCompiler_inline_result = mountWorkInProgressHook();
    markerInstance = {
      state: initialStateProp,
      dispatch: null,
      action: action,
      pending: null
    };
    JSCompiler_inline_result.queue = markerInstance;
    ssrFormState = dispatchActionState.bind(
      null,
      currentlyRenderingFiber$1,
      markerInstance,
      setPendingState,
      ssrFormState
    );
    markerInstance.dispatch = ssrFormState;
    JSCompiler_inline_result.memoizedState = action;
    return [initialStateProp, ssrFormState, !1];
  }
  function updateActionState(action) {
    var stateHook = updateWorkInProgressHook();
    return updateActionStateImpl(stateHook, currentHook, action);
  }
  function updateActionStateImpl(stateHook, currentStateHook, action) {
    currentStateHook = updateReducerImpl(
      stateHook,
      currentStateHook,
      actionStateReducer
    )[0];
    stateHook = updateReducer(basicStateReducer)[0];
    currentStateHook =
      "object" === typeof currentStateHook &&
      null !== currentStateHook &&
      "function" === typeof currentStateHook.then
        ? useThenable(currentStateHook)
        : currentStateHook;
    var actionQueueHook = updateWorkInProgressHook(),
      actionQueue = actionQueueHook.queue,
      dispatch = actionQueue.dispatch;
    action !== actionQueueHook.memoizedState &&
      ((currentlyRenderingFiber$1.flags |= 2048),
      pushEffect(
        9,
        actionStateActionEffect.bind(null, actionQueue, action),
        { destroy: void 0 },
        null
      ));
    return [currentStateHook, dispatch, stateHook];
  }
  function actionStateActionEffect(actionQueue, action) {
    actionQueue.action = action;
  }
  function rerenderActionState(action) {
    var stateHook = updateWorkInProgressHook(),
      currentStateHook = currentHook;
    if (null !== currentStateHook)
      return updateActionStateImpl(stateHook, currentStateHook, action);
    updateWorkInProgressHook();
    stateHook = stateHook.memoizedState;
    currentStateHook = updateWorkInProgressHook();
    var dispatch = currentStateHook.queue.dispatch;
    currentStateHook.memoizedState = action;
    return [stateHook, dispatch, !1];
  }
  function pushEffect(tag, create, inst, deps) {
    tag = { tag: tag, create: create, inst: inst, deps: deps, next: null };
    create = currentlyRenderingFiber$1.updateQueue;
    null === create
      ? ((create = createFunctionComponentUpdateQueue()),
        (currentlyRenderingFiber$1.updateQueue = create),
        (create.lastEffect = tag.next = tag))
      : ((inst = create.lastEffect),
        null === inst
          ? (create.lastEffect = tag.next = tag)
          : ((deps = inst.next),
            (inst.next = tag),
            (tag.next = deps),
            (create.lastEffect = tag)));
    return tag;
  }
  function updateRef() {
    return updateWorkInProgressHook().memoizedState;
  }
  function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
    var hook = mountWorkInProgressHook();
    currentlyRenderingFiber$1.flags |= fiberFlags;
    hook.memoizedState = pushEffect(
      1 | hookFlags,
      create,
      { destroy: void 0 },
      void 0 === deps ? null : deps
    );
  }
  function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
    var hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    var inst = hook.memoizedState.inst;
    null !== currentHook &&
    null !== deps &&
    areHookInputsEqual(deps, currentHook.memoizedState.deps)
      ? (hook.memoizedState = pushEffect(hookFlags, create, inst, deps))
      : ((currentlyRenderingFiber$1.flags |= fiberFlags),
        (hook.memoizedState = pushEffect(1 | hookFlags, create, inst, deps)));
  }
  function mountEffect(create, deps) {
    mountEffectImpl(8390656, 8, create, deps);
  }
  function updateEffect(create, deps) {
    updateEffectImpl(2048, 8, create, deps);
  }
  function updateInsertionEffect(create, deps) {
    return updateEffectImpl(4, 2, create, deps);
  }
  function updateLayoutEffect(create, deps) {
    return updateEffectImpl(4, 4, create, deps);
  }
  function imperativeHandleEffect(create, ref) {
    if ("function" === typeof ref) {
      create = create();
      var refCleanup = ref(create);
      return function () {
        "function" === typeof refCleanup ? refCleanup() : ref(null);
      };
    }
    if (null !== ref && void 0 !== ref)
      return (
        (create = create()),
        (ref.current = create),
        function () {
          ref.current = null;
        }
      );
  }
  function updateImperativeHandle(ref, create, deps) {
    deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
    updateEffectImpl(
      4,
      4,
      imperativeHandleEffect.bind(null, create, ref),
      deps
    );
  }
  function mountDebugValue() {}
  function updateCallback(callback, deps) {
    var hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    var prevState = hook.memoizedState;
    if (null !== deps && areHookInputsEqual(deps, prevState[1]))
      return prevState[0];
    hook.memoizedState = [callback, deps];
    return callback;
  }
  function updateMemo(nextCreate, deps) {
    var hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    var prevState = hook.memoizedState;
    if (null !== deps && areHookInputsEqual(deps, prevState[1]))
      return prevState[0];
    prevState = nextCreate();
    shouldDoubleInvokeUserFnsInHooksDEV &&
      (setIsStrictModeForDevtools(!0),
      nextCreate(),
      setIsStrictModeForDevtools(!1));
    hook.memoizedState = [prevState, deps];
    return prevState;
  }
  function mountDeferredValueImpl(hook, value, initialValue) {
    if (void 0 === initialValue || 0 !== (renderLanes & 1073741824))
      return (hook.memoizedState = value);
    hook.memoizedState = initialValue;
    hook = requestDeferredLane();
    currentlyRenderingFiber$1.lanes |= hook;
    workInProgressRootSkippedLanes |= hook;
    return initialValue;
  }
  function updateDeferredValueImpl(hook, prevValue, value, initialValue) {
    if (objectIs(value, prevValue)) return value;
    if (null !== currentTreeHiddenStackCursor.current)
      return (
        (hook = mountDeferredValueImpl(hook, value, initialValue)),
        objectIs(hook, prevValue) || (didReceiveUpdate = !0),
        hook
      );
    if (0 === (renderLanes & 42))
      return (didReceiveUpdate = !0), (hook.memoizedState = value);
    hook = requestDeferredLane();
    currentlyRenderingFiber$1.lanes |= hook;
    workInProgressRootSkippedLanes |= hook;
    return prevValue;
  }
  function startTransition(
    fiber,
    queue,
    pendingState,
    finishedState,
    callback
  ) {
    var previousPriority = getCurrentUpdatePriority();
    setCurrentUpdatePriority(
      0 !== previousPriority && 8 > previousPriority ? previousPriority : 8
    );
    var prevTransition = ReactSharedInternals.T,
      currentTransition = {};
    ReactSharedInternals.T = currentTransition;
    dispatchOptimisticSetState(fiber, !1, queue, pendingState);
    try {
      var returnValue = callback(),
        onStartTransitionFinish = ReactSharedInternals.S;
      null !== onStartTransitionFinish &&
        onStartTransitionFinish(currentTransition, returnValue);
      if (
        null !== returnValue &&
        "object" === typeof returnValue &&
        "function" === typeof returnValue.then
      ) {
        var thenableForFinishedState = chainThenableValue(
          returnValue,
          finishedState
        );
        dispatchSetState(fiber, queue, thenableForFinishedState);
      } else dispatchSetState(fiber, queue, finishedState);
    } catch (error) {
      dispatchSetState(fiber, queue, {
        then: function () {},
        status: "rejected",
        reason: error
      });
    } finally {
      setCurrentUpdatePriority(previousPriority),
        (ReactSharedInternals.T = prevTransition);
    }
  }
  function ensureFormComponentIsStateful(formFiber) {
    var existingStateHook = formFiber.memoizedState;
    if (null !== existingStateHook) return existingStateHook;
    existingStateHook = {
      memoizedState: NotPendingTransition,
      baseState: NotPendingTransition,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: NotPendingTransition
      },
      next: null
    };
    var initialResetState = {};
    existingStateHook.next = {
      memoizedState: initialResetState,
      baseState: initialResetState,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: initialResetState
      },
      next: null
    };
    formFiber.memoizedState = existingStateHook;
    formFiber = formFiber.alternate;
    null !== formFiber && (formFiber.memoizedState = existingStateHook);
    return existingStateHook;
  }
  function useHostTransitionStatus() {
    var status = readContext(HostTransitionContext);
    return null !== status ? status : NotPendingTransition;
  }
  function updateId() {
    return updateWorkInProgressHook().memoizedState;
  }
  function updateRefresh() {
    return updateWorkInProgressHook().memoizedState;
  }
  function refreshCache(fiber) {
    for (var provider = fiber.return; null !== provider; ) {
      switch (provider.tag) {
        case 24:
        case 3:
          var lane = requestUpdateLane();
          fiber = createUpdate(lane);
          var root = enqueueUpdate(provider, fiber, lane);
          null !== root &&
            (scheduleUpdateOnFiber(root, provider, lane),
            entangleTransitions(root, provider, lane));
          provider = { cache: createCache() };
          fiber.payload = provider;
          return;
      }
      provider = provider.return;
    }
  }
  function dispatchReducerAction(fiber, queue, action) {
    var lane = requestUpdateLane();
    action = {
      lane: lane,
      revertLane: 0,
      action: action,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    isRenderPhaseUpdate(fiber)
      ? enqueueRenderPhaseUpdate(queue, action)
      : ((action = enqueueConcurrentHookUpdate(fiber, queue, action, lane)),
        null !== action &&
          (scheduleUpdateOnFiber(action, fiber, lane),
          entangleTransitionUpdate(action, queue, lane)));
    markStateUpdateScheduled(fiber, lane);
  }
  function dispatchSetState(fiber, queue, action) {
    var lane = requestUpdateLane(),
      update = {
        lane: lane,
        revertLane: 0,
        action: action,
        hasEagerState: !1,
        eagerState: null,
        next: null
      };
    if (isRenderPhaseUpdate(fiber)) enqueueRenderPhaseUpdate(queue, update);
    else {
      var alternate = fiber.alternate;
      if (
        0 === fiber.lanes &&
        (null === alternate || 0 === alternate.lanes) &&
        ((alternate = queue.lastRenderedReducer), null !== alternate)
      )
        try {
          var currentState = queue.lastRenderedState,
            eagerState = alternate(currentState, action);
          update.hasEagerState = !0;
          update.eagerState = eagerState;
          if (objectIs(eagerState, currentState)) {
            enqueueUpdate$1(fiber, queue, update, 0);
            null === workInProgressRoot && finishQueueingConcurrentUpdates();
            return;
          }
        } catch (error) {
        } finally {
        }
      action = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
      null !== action &&
        (scheduleUpdateOnFiber(action, fiber, lane),
        entangleTransitionUpdate(action, queue, lane));
    }
    markStateUpdateScheduled(fiber, lane);
  }
  function dispatchOptimisticSetState(
    fiber,
    throwIfDuringRender,
    queue,
    action
  ) {
    action = {
      lane: 2,
      revertLane: requestTransitionLane(),
      action: action,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (isRenderPhaseUpdate(fiber)) {
      if (throwIfDuringRender) throw Error(formatProdErrorMessage(479));
    } else
      (throwIfDuringRender = enqueueConcurrentHookUpdate(
        fiber,
        queue,
        action,
        2
      )),
        null !== throwIfDuringRender &&
          scheduleUpdateOnFiber(throwIfDuringRender, fiber, 2);
    markStateUpdateScheduled(fiber, 2);
  }
  function isRenderPhaseUpdate(fiber) {
    var alternate = fiber.alternate;
    return (
      fiber === currentlyRenderingFiber$1 ||
      (null !== alternate && alternate === currentlyRenderingFiber$1)
    );
  }
  function enqueueRenderPhaseUpdate(queue, update) {
    didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate =
      !0;
    var pending = queue.pending;
    null === pending
      ? (update.next = update)
      : ((update.next = pending.next), (pending.next = update));
    queue.pending = update;
  }
  function entangleTransitionUpdate(root, queue, lane) {
    if (0 !== (lane & 4194176)) {
      var queueLanes = queue.lanes;
      queueLanes &= root.pendingLanes;
      lane |= queueLanes;
      queue.lanes = lane;
      markRootEntangled(root, lane);
    }
  }
  function startProfilerTimer(fiber) {
    profilerStartTime = now();
    0 > fiber.actualStartTime && (fiber.actualStartTime = now());
  }
  function stopProfilerTimerIfRunningAndRecordDelta(fiber, overrideBaseTime) {
    if (0 <= profilerStartTime) {
      var elapsedTime = now() - profilerStartTime;
      fiber.actualDuration += elapsedTime;
      overrideBaseTime && (fiber.selfBaseDuration = elapsedTime);
      profilerStartTime = -1;
    }
  }
  function recordLayoutEffectDuration(fiber) {
    if (0 <= layoutEffectStartTime) {
      var elapsedTime = now() - layoutEffectStartTime;
      layoutEffectStartTime = -1;
      for (fiber = fiber.return; null !== fiber; ) {
        switch (fiber.tag) {
          case 3:
            fiber.stateNode.effectDuration += elapsedTime;
            return;
          case 12:
            fiber.stateNode.effectDuration += elapsedTime;
            return;
        }
        fiber = fiber.return;
      }
    }
  }
  function recordPassiveEffectDuration(fiber) {
    if (0 <= passiveEffectStartTime) {
      var elapsedTime = now() - passiveEffectStartTime;
      passiveEffectStartTime = -1;
      for (fiber = fiber.return; null !== fiber; ) {
        switch (fiber.tag) {
          case 3:
            fiber = fiber.stateNode;
            null !== fiber && (fiber.passiveEffectDuration += elapsedTime);
            return;
          case 12:
            fiber = fiber.stateNode;
            null !== fiber && (fiber.passiveEffectDuration += elapsedTime);
            return;
        }
        fiber = fiber.return;
      }
    }
  }
  function startLayoutEffectTimer() {
    layoutEffectStartTime = now();
  }
  function transferActualDuration(fiber) {
    for (var child = fiber.child; child; )
      (fiber.actualDuration += child.actualDuration), (child = child.sibling);
  }
  function applyDerivedStateFromProps(
    workInProgress,
    ctor,
    getDerivedStateFromProps,
    nextProps
  ) {
    ctor = workInProgress.memoizedState;
    getDerivedStateFromProps = getDerivedStateFromProps(nextProps, ctor);
    getDerivedStateFromProps =
      null === getDerivedStateFromProps || void 0 === getDerivedStateFromProps
        ? ctor
        : assign({}, ctor, getDerivedStateFromProps);
    workInProgress.memoizedState = getDerivedStateFromProps;
    0 === workInProgress.lanes &&
      (workInProgress.updateQueue.baseState = getDerivedStateFromProps);
  }
  function checkShouldComponentUpdate(
    workInProgress,
    ctor,
    oldProps,
    newProps,
    oldState,
    newState,
    nextContext
  ) {
    workInProgress = workInProgress.stateNode;
    return "function" === typeof workInProgress.shouldComponentUpdate
      ? workInProgress.shouldComponentUpdate(newProps, newState, nextContext)
      : ctor.prototype && ctor.prototype.isPureReactComponent
      ? !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState)
      : !0;
  }
  function callComponentWillReceiveProps(
    workInProgress,
    instance,
    newProps,
    nextContext
  ) {
    workInProgress = instance.state;
    "function" === typeof instance.componentWillReceiveProps &&
      instance.componentWillReceiveProps(newProps, nextContext);
    "function" === typeof instance.UNSAFE_componentWillReceiveProps &&
      instance.UNSAFE_componentWillReceiveProps(newProps, nextContext);
    instance.state !== workInProgress &&
      classComponentUpdater.enqueueReplaceState(instance, instance.state, null);
  }
  function resolveClassComponentProps(Component, baseProps) {
    var newProps = baseProps;
    if ("ref" in baseProps) {
      newProps = {};
      for (var propName in baseProps)
        "ref" !== propName && (newProps[propName] = baseProps[propName]);
    }
    if ((Component = Component.defaultProps)) {
      newProps === baseProps && (newProps = assign({}, newProps));
      for (var propName$55 in Component)
        void 0 === newProps[propName$55] &&
          (newProps[propName$55] = Component[propName$55]);
    }
    return newProps;
  }
  function logUncaughtError(root, errorInfo) {
    try {
      var onUncaughtError = root.onUncaughtError;
      onUncaughtError(errorInfo.value, { componentStack: errorInfo.stack });
    } catch (e) {
      setTimeout(function () {
        throw e;
      });
    }
  }
  function logCaughtError(root, boundary, errorInfo) {
    try {
      var onCaughtError = root.onCaughtError;
      onCaughtError(errorInfo.value, {
        componentStack: errorInfo.stack,
        errorBoundary: 1 === boundary.tag ? boundary.stateNode : null
      });
    } catch (e) {
      setTimeout(function () {
        throw e;
      });
    }
  }
  function createRootErrorUpdate(root, errorInfo, lane) {
    lane = createUpdate(lane);
    lane.tag = 3;
    lane.payload = { element: null };
    lane.callback = function () {
      logUncaughtError(root, errorInfo);
    };
    return lane;
  }
  function createClassErrorUpdate(lane) {
    lane = createUpdate(lane);
    lane.tag = 3;
    return lane;
  }
  function initializeClassErrorUpdate(update, root, fiber, errorInfo) {
    var getDerivedStateFromError = fiber.type.getDerivedStateFromError;
    if ("function" === typeof getDerivedStateFromError) {
      var error = errorInfo.value;
      update.payload = function () {
        return getDerivedStateFromError(error);
      };
      update.callback = function () {
        logCaughtError(root, fiber, errorInfo);
      };
    }
    var inst = fiber.stateNode;
    null !== inst &&
      "function" === typeof inst.componentDidCatch &&
      (update.callback = function () {
        logCaughtError(root, fiber, errorInfo);
        "function" !== typeof getDerivedStateFromError &&
          (null === legacyErrorBoundariesThatAlreadyFailed
            ? (legacyErrorBoundariesThatAlreadyFailed = new Set([this]))
            : legacyErrorBoundariesThatAlreadyFailed.add(this));
        var stack = errorInfo.stack;
        this.componentDidCatch(errorInfo.value, {
          componentStack: null !== stack ? stack : ""
        });
      });
  }
  function throwException(
    root,
    returnFiber,
    sourceFiber,
    value,
    rootRenderLanes
  ) {
    sourceFiber.flags |= 32768;
    isDevToolsPresent && restorePendingUpdaters(root, rootRenderLanes);
    if (
      null !== value &&
      "object" === typeof value &&
      "function" === typeof value.then
    ) {
      sourceFiber = suspenseHandlerStackCursor.current;
      if (null !== sourceFiber) {
        switch (sourceFiber.tag) {
          case 13:
            return (
              null === shellBoundary
                ? renderDidSuspendDelayIfPossible()
                : null === sourceFiber.alternate &&
                  0 === workInProgressRootExitStatus &&
                  (workInProgressRootExitStatus = 3),
              (sourceFiber.flags &= -257),
              (sourceFiber.flags |= 65536),
              (sourceFiber.lanes = rootRenderLanes),
              value === noopSuspenseyCommitThenable
                ? (sourceFiber.flags |= 16384)
                : ((returnFiber = sourceFiber.updateQueue),
                  null === returnFiber
                    ? (sourceFiber.updateQueue = new Set([value]))
                    : returnFiber.add(value),
                  attachPingListener(root, value, rootRenderLanes)),
              !1
            );
          case 22:
            return (
              (sourceFiber.flags |= 65536),
              value === noopSuspenseyCommitThenable
                ? (sourceFiber.flags |= 16384)
                : ((returnFiber = sourceFiber.updateQueue),
                  null === returnFiber
                    ? ((returnFiber = {
                        transitions: null,
                        markerInstances: null,
                        retryQueue: new Set([value])
                      }),
                      (sourceFiber.updateQueue = returnFiber))
                    : ((sourceFiber = returnFiber.retryQueue),
                      null === sourceFiber
                        ? (returnFiber.retryQueue = new Set([value]))
                        : sourceFiber.add(value)),
                  attachPingListener(root, value, rootRenderLanes)),
              !1
            );
        }
        throw Error(formatProdErrorMessage(435, sourceFiber.tag));
      }
      attachPingListener(root, value, rootRenderLanes);
      renderDidSuspendDelayIfPossible();
      return !1;
    }
    if (isHydrating)
      return (
        (returnFiber = suspenseHandlerStackCursor.current),
        null !== returnFiber
          ? (0 === (returnFiber.flags & 65536) && (returnFiber.flags |= 256),
            (returnFiber.flags |= 65536),
            (returnFiber.lanes = rootRenderLanes),
            value !== HydrationMismatchException &&
              ((root = Error(formatProdErrorMessage(422), { cause: value })),
              queueHydrationError(
                createCapturedValueAtFiber(root, sourceFiber)
              )))
          : (value !== HydrationMismatchException &&
              ((returnFiber = Error(formatProdErrorMessage(423), {
                cause: value
              })),
              queueHydrationError(
                createCapturedValueAtFiber(returnFiber, sourceFiber)
              )),
            (root = root.current.alternate),
            (root.flags |= 65536),
            (rootRenderLanes &= -rootRenderLanes),
            (root.lanes |= rootRenderLanes),
            (value = createCapturedValueAtFiber(value, sourceFiber)),
            (rootRenderLanes = createRootErrorUpdate(
              root.stateNode,
              value,
              rootRenderLanes
            )),
            enqueueCapturedUpdate(root, rootRenderLanes),
            4 !== workInProgressRootExitStatus &&
              (workInProgressRootExitStatus = 2)),
        !1
      );
    var wrapperError = Error(formatProdErrorMessage(520), { cause: value });
    wrapperError = createCapturedValueAtFiber(wrapperError, sourceFiber);
    null === workInProgressRootConcurrentErrors
      ? (workInProgressRootConcurrentErrors = [wrapperError])
      : workInProgressRootConcurrentErrors.push(wrapperError);
    4 !== workInProgressRootExitStatus && (workInProgressRootExitStatus = 2);
    if (null === returnFiber) return !0;
    value = createCapturedValueAtFiber(value, sourceFiber);
    sourceFiber = returnFiber;
    do {
      switch (sourceFiber.tag) {
        case 3:
          return (
            (sourceFiber.flags |= 65536),
            (root = rootRenderLanes & -rootRenderLanes),
            (sourceFiber.lanes |= root),
            (root = createRootErrorUpdate(sourceFiber.stateNode, value, root)),
            enqueueCapturedUpdate(sourceFiber, root),
            !1
          );
        case 1:
          if (
            ((returnFiber = sourceFiber.type),
            (wrapperError = sourceFiber.stateNode),
            0 === (sourceFiber.flags & 128) &&
              ("function" === typeof returnFiber.getDerivedStateFromError ||
                (null !== wrapperError &&
                  "function" === typeof wrapperError.componentDidCatch &&
                  (null === legacyErrorBoundariesThatAlreadyFailed ||
                    !legacyErrorBoundariesThatAlreadyFailed.has(
                      wrapperError
                    )))))
          )
            return (
              (sourceFiber.flags |= 65536),
              (rootRenderLanes &= -rootRenderLanes),
              (sourceFiber.lanes |= rootRenderLanes),
              (rootRenderLanes = createClassErrorUpdate(rootRenderLanes)),
              initializeClassErrorUpdate(
                rootRenderLanes,
                root,
                sourceFiber,
                value
              ),
              enqueueCapturedUpdate(sourceFiber, rootRenderLanes),
              !1
            );
      }
      sourceFiber = sourceFiber.return;
    } while (null !== sourceFiber);
    return !1;
  }
  function reconcileChildren(
    current,
    workInProgress,
    nextChildren,
    renderLanes
  ) {
    workInProgress.child =
      null === current
        ? mountChildFibers(workInProgress, null, nextChildren, renderLanes)
        : reconcileChildFibers(
            workInProgress,
            current.child,
            nextChildren,
            renderLanes
          );
  }
  function updateForwardRef(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes
  ) {
    Component = Component.render;
    var ref = workInProgress.ref;
    if ("ref" in nextProps) {
      var propsWithoutRef = {};
      for (var key in nextProps)
        "ref" !== key && (propsWithoutRef[key] = nextProps[key]);
    } else propsWithoutRef = nextProps;
    prepareToReadContext(workInProgress, renderLanes);
    markComponentRenderStarted(workInProgress);
    nextProps = renderWithHooks(
      current,
      workInProgress,
      Component,
      propsWithoutRef,
      ref,
      renderLanes
    );
    key = checkDidRenderIdHook();
    markComponentRenderStopped();
    if (null !== current && !didReceiveUpdate)
      return (
        bailoutHooks(current, workInProgress, renderLanes),
        bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
      );
    isHydrating && key && pushMaterializedTreeId(workInProgress);
    workInProgress.flags |= 1;
    reconcileChildren(current, workInProgress, nextProps, renderLanes);
    return workInProgress.child;
  }
  function updateMemoComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes
  ) {
    if (null === current) {
      var type = Component.type;
      if (
        "function" === typeof type &&
        !shouldConstruct(type) &&
        void 0 === type.defaultProps &&
        null === Component.compare
      )
        return (
          (workInProgress.tag = 15),
          (workInProgress.type = type),
          updateSimpleMemoComponent(
            current,
            workInProgress,
            type,
            nextProps,
            renderLanes
          )
        );
      current = createFiberFromTypeAndProps(
        Component.type,
        null,
        nextProps,
        workInProgress,
        workInProgress.mode,
        renderLanes
      );
      current.ref = workInProgress.ref;
      current.return = workInProgress;
      return (workInProgress.child = current);
    }
    type = current.child;
    if (0 === (current.lanes & renderLanes)) {
      var prevProps = type.memoizedProps;
      Component = Component.compare;
      Component = null !== Component ? Component : shallowEqual;
      if (Component(prevProps, nextProps) && current.ref === workInProgress.ref)
        return bailoutOnAlreadyFinishedWork(
          current,
          workInProgress,
          renderLanes
        );
    }
    workInProgress.flags |= 1;
    current = createWorkInProgress(type, nextProps);
    current.ref = workInProgress.ref;
    current.return = workInProgress;
    return (workInProgress.child = current);
  }
  function updateSimpleMemoComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes
  ) {
    if (null !== current) {
      var prevProps = current.memoizedProps;
      if (
        shallowEqual(prevProps, nextProps) &&
        current.ref === workInProgress.ref
      )
        if (
          ((didReceiveUpdate = !1),
          (workInProgress.pendingProps = nextProps = prevProps),
          0 !== (current.lanes & renderLanes))
        )
          0 !== (current.flags & 131072) && (didReceiveUpdate = !0);
        else
          return (
            (workInProgress.lanes = current.lanes),
            bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
          );
    }
    return updateFunctionComponent(
      current,
      workInProgress,
      Component,
      nextProps,
      renderLanes
    );
  }
  function updateOffscreenComponent(current, workInProgress, renderLanes) {
    var nextProps = workInProgress.pendingProps,
      nextChildren = nextProps.children,
      nextIsDetached = 0 !== (workInProgress.stateNode._pendingVisibility & 2),
      prevState = null !== current ? current.memoizedState : null;
    markRef(current, workInProgress);
    if ("hidden" === nextProps.mode || nextIsDetached) {
      if (0 !== (workInProgress.flags & 128)) {
        renderLanes =
          null !== prevState ? prevState.baseLanes | renderLanes : renderLanes;
        if (null !== current) {
          nextProps = workInProgress.child = current.child;
          for (nextChildren = 0; null !== nextProps; )
            (nextChildren =
              nextChildren | nextProps.lanes | nextProps.childLanes),
              (nextProps = nextProps.sibling);
          workInProgress.childLanes = nextChildren & ~renderLanes;
        } else (workInProgress.childLanes = 0), (workInProgress.child = null);
        return deferHiddenOffscreenComponent(
          current,
          workInProgress,
          renderLanes
        );
      }
      if (0 !== (renderLanes & 536870912))
        (workInProgress.memoizedState = { baseLanes: 0, cachePool: null }),
          null !== current &&
            pushTransition(
              workInProgress,
              null !== prevState ? prevState.cachePool : null
            ),
          null !== prevState
            ? pushHiddenContext(workInProgress, prevState)
            : reuseHiddenContextOnStack(),
          pushOffscreenSuspenseHandler(workInProgress);
      else
        return (
          (workInProgress.lanes = workInProgress.childLanes = 536870912),
          deferHiddenOffscreenComponent(
            current,
            workInProgress,
            null !== prevState ? prevState.baseLanes | renderLanes : renderLanes
          )
        );
    } else
      null !== prevState
        ? (pushTransition(workInProgress, prevState.cachePool),
          pushHiddenContext(workInProgress, prevState),
          reuseSuspenseHandlerOnStack(workInProgress),
          (workInProgress.memoizedState = null))
        : (null !== current && pushTransition(workInProgress, null),
          reuseHiddenContextOnStack(),
          reuseSuspenseHandlerOnStack(workInProgress));
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
  }
  function deferHiddenOffscreenComponent(
    current,
    workInProgress,
    nextBaseLanes
  ) {
    var JSCompiler_inline_result = peekCacheFromPool();
    JSCompiler_inline_result =
      null === JSCompiler_inline_result
        ? null
        : {
            parent: isPrimaryRenderer
              ? CacheContext._currentValue
              : CacheContext._currentValue2,
            pool: JSCompiler_inline_result
          };
    workInProgress.memoizedState = {
      baseLanes: nextBaseLanes,
      cachePool: JSCompiler_inline_result
    };
    null !== current && pushTransition(workInProgress, null);
    reuseHiddenContextOnStack();
    pushOffscreenSuspenseHandler(workInProgress);
    return null;
  }
  function markRef(current, workInProgress) {
    var ref = workInProgress.ref;
    if (null === ref)
      null !== current &&
        null !== current.ref &&
        (workInProgress.flags |= 2097664);
    else {
      if ("function" !== typeof ref && "object" !== typeof ref)
        throw Error(formatProdErrorMessage(284));
      if (null === current || current.ref !== ref)
        workInProgress.flags |= 2097664;
    }
  }
  function updateFunctionComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes
  ) {
    prepareToReadContext(workInProgress, renderLanes);
    markComponentRenderStarted(workInProgress);
    Component = renderWithHooks(
      current,
      workInProgress,
      Component,
      nextProps,
      void 0,
      renderLanes
    );
    nextProps = checkDidRenderIdHook();
    markComponentRenderStopped();
    if (null !== current && !didReceiveUpdate)
      return (
        bailoutHooks(current, workInProgress, renderLanes),
        bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
      );
    isHydrating && nextProps && pushMaterializedTreeId(workInProgress);
    workInProgress.flags |= 1;
    reconcileChildren(current, workInProgress, Component, renderLanes);
    return workInProgress.child;
  }
  function replayFunctionComponent(
    current,
    workInProgress,
    nextProps,
    Component,
    secondArg,
    renderLanes
  ) {
    prepareToReadContext(workInProgress, renderLanes);
    markComponentRenderStarted(workInProgress);
    nextProps = renderWithHooksAgain(
      workInProgress,
      Component,
      nextProps,
      secondArg
    );
    finishRenderingHooks();
    Component = checkDidRenderIdHook();
    markComponentRenderStopped();
    if (null !== current && !didReceiveUpdate)
      return (
        bailoutHooks(current, workInProgress, renderLanes),
        bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
      );
    isHydrating && Component && pushMaterializedTreeId(workInProgress);
    workInProgress.flags |= 1;
    reconcileChildren(current, workInProgress, nextProps, renderLanes);
    return workInProgress.child;
  }
  function updateClassComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes
  ) {
    prepareToReadContext(workInProgress, renderLanes);
    if (null === workInProgress.stateNode) {
      var context = emptyContextObject,
        contextType = Component.contextType;
      "object" === typeof contextType &&
        null !== contextType &&
        (context = readContext(contextType));
      context = new Component(nextProps, context);
      workInProgress.memoizedState =
        null !== context.state && void 0 !== context.state
          ? context.state
          : null;
      context.updater = classComponentUpdater;
      workInProgress.stateNode = context;
      context._reactInternals = workInProgress;
      context = workInProgress.stateNode;
      context.props = nextProps;
      context.state = workInProgress.memoizedState;
      context.refs = {};
      initializeUpdateQueue(workInProgress);
      contextType = Component.contextType;
      context.context =
        "object" === typeof contextType && null !== contextType
          ? readContext(contextType)
          : emptyContextObject;
      context.state = workInProgress.memoizedState;
      contextType = Component.getDerivedStateFromProps;
      "function" === typeof contextType &&
        (applyDerivedStateFromProps(
          workInProgress,
          Component,
          contextType,
          nextProps
        ),
        (context.state = workInProgress.memoizedState));
      "function" === typeof Component.getDerivedStateFromProps ||
        "function" === typeof context.getSnapshotBeforeUpdate ||
        ("function" !== typeof context.UNSAFE_componentWillMount &&
          "function" !== typeof context.componentWillMount) ||
        ((contextType = context.state),
        "function" === typeof context.componentWillMount &&
          context.componentWillMount(),
        "function" === typeof context.UNSAFE_componentWillMount &&
          context.UNSAFE_componentWillMount(),
        contextType !== context.state &&
          classComponentUpdater.enqueueReplaceState(
            context,
            context.state,
            null
          ),
        processUpdateQueue(workInProgress, nextProps, context, renderLanes),
        suspendIfUpdateReadFromEntangledAsyncAction(),
        (context.state = workInProgress.memoizedState));
      "function" === typeof context.componentDidMount &&
        (workInProgress.flags |= 4194308);
      nextProps = !0;
    } else if (null === current) {
      context = workInProgress.stateNode;
      var unresolvedOldProps = workInProgress.memoizedProps,
        oldProps = resolveClassComponentProps(Component, unresolvedOldProps);
      context.props = oldProps;
      var oldContext = context.context,
        contextType$jscomp$0 = Component.contextType;
      contextType = emptyContextObject;
      "object" === typeof contextType$jscomp$0 &&
        null !== contextType$jscomp$0 &&
        (contextType = readContext(contextType$jscomp$0));
      var getDerivedStateFromProps = Component.getDerivedStateFromProps;
      contextType$jscomp$0 =
        "function" === typeof getDerivedStateFromProps ||
        "function" === typeof context.getSnapshotBeforeUpdate;
      unresolvedOldProps = workInProgress.pendingProps !== unresolvedOldProps;
      contextType$jscomp$0 ||
        ("function" !== typeof context.UNSAFE_componentWillReceiveProps &&
          "function" !== typeof context.componentWillReceiveProps) ||
        ((unresolvedOldProps || oldContext !== contextType) &&
          callComponentWillReceiveProps(
            workInProgress,
            context,
            nextProps,
            contextType
          ));
      hasForceUpdate = !1;
      var oldState = workInProgress.memoizedState;
      context.state = oldState;
      processUpdateQueue(workInProgress, nextProps, context, renderLanes);
      suspendIfUpdateReadFromEntangledAsyncAction();
      oldContext = workInProgress.memoizedState;
      unresolvedOldProps || oldState !== oldContext || hasForceUpdate
        ? ("function" === typeof getDerivedStateFromProps &&
            (applyDerivedStateFromProps(
              workInProgress,
              Component,
              getDerivedStateFromProps,
              nextProps
            ),
            (oldContext = workInProgress.memoizedState)),
          (oldProps =
            hasForceUpdate ||
            checkShouldComponentUpdate(
              workInProgress,
              Component,
              oldProps,
              nextProps,
              oldState,
              oldContext,
              contextType
            ))
            ? (contextType$jscomp$0 ||
                ("function" !== typeof context.UNSAFE_componentWillMount &&
                  "function" !== typeof context.componentWillMount) ||
                ("function" === typeof context.componentWillMount &&
                  context.componentWillMount(),
                "function" === typeof context.UNSAFE_componentWillMount &&
                  context.UNSAFE_componentWillMount()),
              "function" === typeof context.componentDidMount &&
                (workInProgress.flags |= 4194308))
            : ("function" === typeof context.componentDidMount &&
                (workInProgress.flags |= 4194308),
              (workInProgress.memoizedProps = nextProps),
              (workInProgress.memoizedState = oldContext)),
          (context.props = nextProps),
          (context.state = oldContext),
          (context.context = contextType),
          (nextProps = oldProps))
        : ("function" === typeof context.componentDidMount &&
            (workInProgress.flags |= 4194308),
          (nextProps = !1));
    } else {
      context = workInProgress.stateNode;
      cloneUpdateQueue(current, workInProgress);
      contextType = workInProgress.memoizedProps;
      contextType$jscomp$0 = resolveClassComponentProps(Component, contextType);
      context.props = contextType$jscomp$0;
      getDerivedStateFromProps = workInProgress.pendingProps;
      oldState = context.context;
      oldContext = Component.contextType;
      oldProps = emptyContextObject;
      "object" === typeof oldContext &&
        null !== oldContext &&
        (oldProps = readContext(oldContext));
      unresolvedOldProps = Component.getDerivedStateFromProps;
      (oldContext =
        "function" === typeof unresolvedOldProps ||
        "function" === typeof context.getSnapshotBeforeUpdate) ||
        ("function" !== typeof context.UNSAFE_componentWillReceiveProps &&
          "function" !== typeof context.componentWillReceiveProps) ||
        ((contextType !== getDerivedStateFromProps || oldState !== oldProps) &&
          callComponentWillReceiveProps(
            workInProgress,
            context,
            nextProps,
            oldProps
          ));
      hasForceUpdate = !1;
      oldState = workInProgress.memoizedState;
      context.state = oldState;
      processUpdateQueue(workInProgress, nextProps, context, renderLanes);
      suspendIfUpdateReadFromEntangledAsyncAction();
      var newState = workInProgress.memoizedState;
      contextType !== getDerivedStateFromProps ||
      oldState !== newState ||
      hasForceUpdate
        ? ("function" === typeof unresolvedOldProps &&
            (applyDerivedStateFromProps(
              workInProgress,
              Component,
              unresolvedOldProps,
              nextProps
            ),
            (newState = workInProgress.memoizedState)),
          (contextType$jscomp$0 =
            hasForceUpdate ||
            checkShouldComponentUpdate(
              workInProgress,
              Component,
              contextType$jscomp$0,
              nextProps,
              oldState,
              newState,
              oldProps
            ) ||
            !1)
            ? (oldContext ||
                ("function" !== typeof context.UNSAFE_componentWillUpdate &&
                  "function" !== typeof context.componentWillUpdate) ||
                ("function" === typeof context.componentWillUpdate &&
                  context.componentWillUpdate(nextProps, newState, oldProps),
                "function" === typeof context.UNSAFE_componentWillUpdate &&
                  context.UNSAFE_componentWillUpdate(
                    nextProps,
                    newState,
                    oldProps
                  )),
              "function" === typeof context.componentDidUpdate &&
                (workInProgress.flags |= 4),
              "function" === typeof context.getSnapshotBeforeUpdate &&
                (workInProgress.flags |= 1024))
            : ("function" !== typeof context.componentDidUpdate ||
                (contextType === current.memoizedProps &&
                  oldState === current.memoizedState) ||
                (workInProgress.flags |= 4),
              "function" !== typeof context.getSnapshotBeforeUpdate ||
                (contextType === current.memoizedProps &&
                  oldState === current.memoizedState) ||
                (workInProgress.flags |= 1024),
              (workInProgress.memoizedProps = nextProps),
              (workInProgress.memoizedState = newState)),
          (context.props = nextProps),
          (context.state = newState),
          (context.context = oldProps),
          (nextProps = contextType$jscomp$0))
        : ("function" !== typeof context.componentDidUpdate ||
            (contextType === current.memoizedProps &&
              oldState === current.memoizedState) ||
            (workInProgress.flags |= 4),
          "function" !== typeof context.getSnapshotBeforeUpdate ||
            (contextType === current.memoizedProps &&
              oldState === current.memoizedState) ||
            (workInProgress.flags |= 1024),
          (nextProps = !1));
    }
    context = nextProps;
    markRef(current, workInProgress);
    nextProps = 0 !== (workInProgress.flags & 128);
    context || nextProps
      ? ((context = workInProgress.stateNode),
        nextProps && "function" !== typeof Component.getDerivedStateFromError
          ? ((Component = null), (profilerStartTime = -1))
          : (markComponentRenderStarted(workInProgress),
            (Component = context.render()),
            markComponentRenderStopped()),
        (workInProgress.flags |= 1),
        null !== current && nextProps
          ? ((workInProgress.child = reconcileChildFibers(
              workInProgress,
              current.child,
              null,
              renderLanes
            )),
            (workInProgress.child = reconcileChildFibers(
              workInProgress,
              null,
              Component,
              renderLanes
            )))
          : reconcileChildren(current, workInProgress, Component, renderLanes),
        (workInProgress.memoizedState = context.state),
        (current = workInProgress.child))
      : (current = bailoutOnAlreadyFinishedWork(
          current,
          workInProgress,
          renderLanes
        ));
    return current;
  }
  function mountHostRootWithoutHydrating(
    current,
    workInProgress,
    nextChildren,
    renderLanes
  ) {
    resetHydrationState();
    workInProgress.flags |= 256;
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    return workInProgress.child;
  }
  function mountSuspenseOffscreenState(renderLanes) {
    return { baseLanes: renderLanes, cachePool: getSuspendedCache() };
  }
  function getRemainingWorkInPrimaryTree(
    current,
    primaryTreeDidDefer,
    renderLanes
  ) {
    current = null !== current ? current.childLanes & ~renderLanes : 0;
    primaryTreeDidDefer && (current |= workInProgressDeferredLane);
    return current;
  }
  function updateSuspenseComponent(current, workInProgress, renderLanes) {
    var nextProps = workInProgress.pendingProps,
      showFallback = !1,
      didSuspend = 0 !== (workInProgress.flags & 128),
      JSCompiler_temp;
    (JSCompiler_temp = didSuspend) ||
      (JSCompiler_temp =
        null !== current && null === current.memoizedState
          ? !1
          : 0 !== (suspenseStackCursor.current & 2));
    JSCompiler_temp && ((showFallback = !0), (workInProgress.flags &= -129));
    JSCompiler_temp = 0 !== (workInProgress.flags & 32);
    workInProgress.flags &= -33;
    if (null === current) {
      if (isHydrating) {
        showFallback
          ? pushPrimaryTreeSuspenseHandler(workInProgress)
          : reuseSuspenseHandlerOnStack(workInProgress);
        if (isHydrating) {
          var nextInstance = nextHydratableInstance,
            JSCompiler_temp$jscomp$0;
          if ((JSCompiler_temp$jscomp$0 = nextInstance))
            (nextInstance = canHydrateSuspenseInstance(
              nextInstance,
              rootOrSingletonContext
            )),
              null !== nextInstance
                ? ((workInProgress.memoizedState = {
                    dehydrated: nextInstance,
                    treeContext:
                      null !== treeContextProvider
                        ? { id: treeContextId, overflow: treeContextOverflow }
                        : null,
                    retryLane: 536870912
                  }),
                  (JSCompiler_temp$jscomp$0 = createFiber(18, null, null, 0)),
                  (JSCompiler_temp$jscomp$0.stateNode = nextInstance),
                  (JSCompiler_temp$jscomp$0.return = workInProgress),
                  (workInProgress.child = JSCompiler_temp$jscomp$0),
                  (hydrationParentFiber = workInProgress),
                  (nextHydratableInstance = null),
                  (JSCompiler_temp$jscomp$0 = !0))
                : (JSCompiler_temp$jscomp$0 = !1);
          JSCompiler_temp$jscomp$0 || throwOnHydrationMismatch(workInProgress);
        }
        nextInstance = workInProgress.memoizedState;
        if (
          null !== nextInstance &&
          ((nextInstance = nextInstance.dehydrated), null !== nextInstance)
        )
          return (
            isSuspenseInstanceFallback(nextInstance)
              ? (workInProgress.lanes = 16)
              : (workInProgress.lanes = 536870912),
            null
          );
        popSuspenseHandler(workInProgress);
      }
      nextInstance = nextProps.children;
      nextProps = nextProps.fallback;
      if (showFallback)
        return (
          reuseSuspenseHandlerOnStack(workInProgress),
          (showFallback = workInProgress.mode),
          (nextInstance = mountWorkInProgressOffscreenFiber(
            { mode: "hidden", children: nextInstance },
            showFallback
          )),
          (nextProps = createFiberFromFragment(
            nextProps,
            showFallback,
            renderLanes,
            null
          )),
          (nextInstance.return = workInProgress),
          (nextProps.return = workInProgress),
          (nextInstance.sibling = nextProps),
          (workInProgress.child = nextInstance),
          (showFallback = workInProgress.child),
          (showFallback.memoizedState =
            mountSuspenseOffscreenState(renderLanes)),
          (showFallback.childLanes = getRemainingWorkInPrimaryTree(
            current,
            JSCompiler_temp,
            renderLanes
          )),
          (workInProgress.memoizedState = SUSPENDED_MARKER),
          nextProps
        );
      pushPrimaryTreeSuspenseHandler(workInProgress);
      return mountSuspensePrimaryChildren(workInProgress, nextInstance);
    }
    JSCompiler_temp$jscomp$0 = current.memoizedState;
    if (
      null !== JSCompiler_temp$jscomp$0 &&
      ((nextInstance = JSCompiler_temp$jscomp$0.dehydrated),
      null !== nextInstance)
    ) {
      if (didSuspend)
        workInProgress.flags & 256
          ? (pushPrimaryTreeSuspenseHandler(workInProgress),
            (workInProgress.flags &= -257),
            (workInProgress = retrySuspenseComponentWithoutHydrating(
              current,
              workInProgress,
              renderLanes
            )))
          : null !== workInProgress.memoizedState
          ? (reuseSuspenseHandlerOnStack(workInProgress),
            (workInProgress.child = current.child),
            (workInProgress.flags |= 128),
            (workInProgress = null))
          : (reuseSuspenseHandlerOnStack(workInProgress),
            (showFallback = nextProps.fallback),
            (nextInstance = workInProgress.mode),
            (nextProps = mountWorkInProgressOffscreenFiber(
              { mode: "visible", children: nextProps.children },
              nextInstance
            )),
            (showFallback = createFiberFromFragment(
              showFallback,
              nextInstance,
              renderLanes,
              null
            )),
            (showFallback.flags |= 2),
            (nextProps.return = workInProgress),
            (showFallback.return = workInProgress),
            (nextProps.sibling = showFallback),
            (workInProgress.child = nextProps),
            reconcileChildFibers(
              workInProgress,
              current.child,
              null,
              renderLanes
            ),
            (nextProps = workInProgress.child),
            (nextProps.memoizedState =
              mountSuspenseOffscreenState(renderLanes)),
            (nextProps.childLanes = getRemainingWorkInPrimaryTree(
              current,
              JSCompiler_temp,
              renderLanes
            )),
            (workInProgress.memoizedState = SUSPENDED_MARKER),
            (workInProgress = showFallback));
      else if (
        (pushPrimaryTreeSuspenseHandler(workInProgress),
        isSuspenseInstanceFallback(nextInstance))
      )
        (JSCompiler_temp =
          getSuspenseInstanceFallbackErrorDetails(nextInstance).digest),
          (nextProps = Error(formatProdErrorMessage(419))),
          (nextProps.stack = ""),
          (nextProps.digest = JSCompiler_temp),
          queueHydrationError({ value: nextProps, source: null, stack: null }),
          (workInProgress = retrySuspenseComponentWithoutHydrating(
            current,
            workInProgress,
            renderLanes
          ));
      else if (
        ((JSCompiler_temp = 0 !== (renderLanes & current.childLanes)),
        didReceiveUpdate || JSCompiler_temp)
      ) {
        JSCompiler_temp = workInProgressRoot;
        if (null !== JSCompiler_temp) {
          nextProps = renderLanes & -renderLanes;
          if (0 !== (nextProps & 42)) nextProps = 1;
          else
            switch (nextProps) {
              case 2:
                nextProps = 1;
                break;
              case 8:
                nextProps = 4;
                break;
              case 32:
                nextProps = 16;
                break;
              case 128:
              case 256:
              case 512:
              case 1024:
              case 2048:
              case 4096:
              case 8192:
              case 16384:
              case 32768:
              case 65536:
              case 131072:
              case 262144:
              case 524288:
              case 1048576:
              case 2097152:
              case 4194304:
              case 8388608:
              case 16777216:
              case 33554432:
                nextProps = 64;
                break;
              case 268435456:
                nextProps = 134217728;
                break;
              default:
                nextProps = 0;
            }
          nextProps =
            0 !== (nextProps & (JSCompiler_temp.suspendedLanes | renderLanes))
              ? 0
              : nextProps;
          if (
            0 !== nextProps &&
            nextProps !== JSCompiler_temp$jscomp$0.retryLane
          )
            throw (
              ((JSCompiler_temp$jscomp$0.retryLane = nextProps),
              enqueueConcurrentRenderForLane(current, nextProps),
              scheduleUpdateOnFiber(JSCompiler_temp, current, nextProps),
              SelectiveHydrationException)
            );
        }
        isSuspenseInstancePending(nextInstance) ||
          renderDidSuspendDelayIfPossible();
        workInProgress = retrySuspenseComponentWithoutHydrating(
          current,
          workInProgress,
          renderLanes
        );
      } else
        isSuspenseInstancePending(nextInstance)
          ? ((workInProgress.flags |= 128),
            (workInProgress.child = current.child),
            (workInProgress = retryDehydratedSuspenseBoundary.bind(
              null,
              current
            )),
            registerSuspenseInstanceRetry(nextInstance, workInProgress),
            (workInProgress = null))
          : ((current = JSCompiler_temp$jscomp$0.treeContext),
            supportsHydration &&
              ((nextHydratableInstance =
                getFirstHydratableChildWithinSuspenseInstance(nextInstance)),
              (hydrationParentFiber = workInProgress),
              (isHydrating = !0),
              (hydrationErrors = null),
              (rootOrSingletonContext = !1),
              null !== current &&
                ((idStack[idStackIndex++] = treeContextId),
                (idStack[idStackIndex++] = treeContextOverflow),
                (idStack[idStackIndex++] = treeContextProvider),
                (treeContextId = current.id),
                (treeContextOverflow = current.overflow),
                (treeContextProvider = workInProgress))),
            (workInProgress = mountSuspensePrimaryChildren(
              workInProgress,
              nextProps.children
            )),
            (workInProgress.flags |= 4096));
      return workInProgress;
    }
    if (showFallback)
      return (
        reuseSuspenseHandlerOnStack(workInProgress),
        (showFallback = nextProps.fallback),
        (nextInstance = workInProgress.mode),
        (JSCompiler_temp$jscomp$0 = current.child),
        (didSuspend = JSCompiler_temp$jscomp$0.sibling),
        (nextProps = createWorkInProgress(JSCompiler_temp$jscomp$0, {
          mode: "hidden",
          children: nextProps.children
        })),
        (nextProps.subtreeFlags =
          JSCompiler_temp$jscomp$0.subtreeFlags & 31457280),
        null !== didSuspend
          ? (showFallback = createWorkInProgress(didSuspend, showFallback))
          : ((showFallback = createFiberFromFragment(
              showFallback,
              nextInstance,
              renderLanes,
              null
            )),
            (showFallback.flags |= 2)),
        (showFallback.return = workInProgress),
        (nextProps.return = workInProgress),
        (nextProps.sibling = showFallback),
        (workInProgress.child = nextProps),
        (nextProps = showFallback),
        (showFallback = workInProgress.child),
        (nextInstance = current.child.memoizedState),
        null === nextInstance
          ? (nextInstance = mountSuspenseOffscreenState(renderLanes))
          : ((JSCompiler_temp$jscomp$0 = nextInstance.cachePool),
            null !== JSCompiler_temp$jscomp$0
              ? ((didSuspend = isPrimaryRenderer
                  ? CacheContext._currentValue
                  : CacheContext._currentValue2),
                (JSCompiler_temp$jscomp$0 =
                  JSCompiler_temp$jscomp$0.parent !== didSuspend
                    ? { parent: didSuspend, pool: didSuspend }
                    : JSCompiler_temp$jscomp$0))
              : (JSCompiler_temp$jscomp$0 = getSuspendedCache()),
            (nextInstance = {
              baseLanes: nextInstance.baseLanes | renderLanes,
              cachePool: JSCompiler_temp$jscomp$0
            })),
        (showFallback.memoizedState = nextInstance),
        (showFallback.childLanes = getRemainingWorkInPrimaryTree(
          current,
          JSCompiler_temp,
          renderLanes
        )),
        (workInProgress.memoizedState = SUSPENDED_MARKER),
        nextProps
      );
    pushPrimaryTreeSuspenseHandler(workInProgress);
    renderLanes = current.child;
    current = renderLanes.sibling;
    renderLanes = createWorkInProgress(renderLanes, {
      mode: "visible",
      children: nextProps.children
    });
    renderLanes.return = workInProgress;
    renderLanes.sibling = null;
    null !== current &&
      ((JSCompiler_temp = workInProgress.deletions),
      null === JSCompiler_temp
        ? ((workInProgress.deletions = [current]), (workInProgress.flags |= 16))
        : JSCompiler_temp.push(current));
    workInProgress.child = renderLanes;
    workInProgress.memoizedState = null;
    return renderLanes;
  }
  function mountSuspensePrimaryChildren(workInProgress, primaryChildren) {
    primaryChildren = mountWorkInProgressOffscreenFiber(
      { mode: "visible", children: primaryChildren },
      workInProgress.mode
    );
    primaryChildren.return = workInProgress;
    return (workInProgress.child = primaryChildren);
  }
  function mountWorkInProgressOffscreenFiber(offscreenProps, mode) {
    return createFiberFromOffscreen(offscreenProps, mode, 0, null);
  }
  function retrySuspenseComponentWithoutHydrating(
    current,
    workInProgress,
    renderLanes
  ) {
    reconcileChildFibers(workInProgress, current.child, null, renderLanes);
    current = mountSuspensePrimaryChildren(
      workInProgress,
      workInProgress.pendingProps.children
    );
    current.flags |= 2;
    workInProgress.memoizedState = null;
    return current;
  }
  function scheduleSuspenseWorkOnFiber(fiber, renderLanes, propagationRoot) {
    fiber.lanes |= renderLanes;
    var alternate = fiber.alternate;
    null !== alternate && (alternate.lanes |= renderLanes);
    scheduleContextWorkOnParentPath(fiber.return, renderLanes, propagationRoot);
  }
  function initSuspenseListRenderState(
    workInProgress,
    isBackwards,
    tail,
    lastContentRow,
    tailMode
  ) {
    var renderState = workInProgress.memoizedState;
    null === renderState
      ? (workInProgress.memoizedState = {
          isBackwards: isBackwards,
          rendering: null,
          renderingStartTime: 0,
          last: lastContentRow,
          tail: tail,
          tailMode: tailMode
        })
      : ((renderState.isBackwards = isBackwards),
        (renderState.rendering = null),
        (renderState.renderingStartTime = 0),
        (renderState.last = lastContentRow),
        (renderState.tail = tail),
        (renderState.tailMode = tailMode));
  }
  function updateSuspenseListComponent(current, workInProgress, renderLanes) {
    var nextProps = workInProgress.pendingProps,
      revealOrder = nextProps.revealOrder,
      tailMode = nextProps.tail;
    reconcileChildren(current, workInProgress, nextProps.children, renderLanes);
    nextProps = suspenseStackCursor.current;
    if (0 !== (nextProps & 2))
      (nextProps = (nextProps & 1) | 2), (workInProgress.flags |= 128);
    else {
      if (null !== current && 0 !== (current.flags & 128))
        a: for (current = workInProgress.child; null !== current; ) {
          if (13 === current.tag)
            null !== current.memoizedState &&
              scheduleSuspenseWorkOnFiber(current, renderLanes, workInProgress);
          else if (19 === current.tag)
            scheduleSuspenseWorkOnFiber(current, renderLanes, workInProgress);
          else if (null !== current.child) {
            current.child.return = current;
            current = current.child;
            continue;
          }
          if (current === workInProgress) break a;
          for (; null === current.sibling; ) {
            if (null === current.return || current.return === workInProgress)
              break a;
            current = current.return;
          }
          current.sibling.return = current.return;
          current = current.sibling;
        }
      nextProps &= 1;
    }
    push(suspenseStackCursor, nextProps);
    switch (revealOrder) {
      case "forwards":
        renderLanes = workInProgress.child;
        for (revealOrder = null; null !== renderLanes; )
          (current = renderLanes.alternate),
            null !== current &&
              null === findFirstSuspended(current) &&
              (revealOrder = renderLanes),
            (renderLanes = renderLanes.sibling);
        renderLanes = revealOrder;
        null === renderLanes
          ? ((revealOrder = workInProgress.child),
            (workInProgress.child = null))
          : ((revealOrder = renderLanes.sibling), (renderLanes.sibling = null));
        initSuspenseListRenderState(
          workInProgress,
          !1,
          revealOrder,
          renderLanes,
          tailMode
        );
        break;
      case "backwards":
        renderLanes = null;
        revealOrder = workInProgress.child;
        for (workInProgress.child = null; null !== revealOrder; ) {
          current = revealOrder.alternate;
          if (null !== current && null === findFirstSuspended(current)) {
            workInProgress.child = revealOrder;
            break;
          }
          current = revealOrder.sibling;
          revealOrder.sibling = renderLanes;
          renderLanes = revealOrder;
          revealOrder = current;
        }
        initSuspenseListRenderState(
          workInProgress,
          !0,
          renderLanes,
          null,
          tailMode
        );
        break;
      case "together":
        initSuspenseListRenderState(workInProgress, !1, null, null, void 0);
        break;
      default:
        workInProgress.memoizedState = null;
    }
    return workInProgress.child;
  }
  function bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes) {
    null !== current && (workInProgress.dependencies = current.dependencies);
    profilerStartTime = -1;
    workInProgressRootSkippedLanes |= workInProgress.lanes;
    if (0 === (renderLanes & workInProgress.childLanes)) return null;
    if (null !== current && workInProgress.child !== current.child)
      throw Error(formatProdErrorMessage(153));
    if (null !== workInProgress.child) {
      current = workInProgress.child;
      renderLanes = createWorkInProgress(current, current.pendingProps);
      workInProgress.child = renderLanes;
      for (renderLanes.return = workInProgress; null !== current.sibling; )
        (current = current.sibling),
          (renderLanes = renderLanes.sibling =
            createWorkInProgress(current, current.pendingProps)),
          (renderLanes.return = workInProgress);
      renderLanes.sibling = null;
    }
    return workInProgress.child;
  }
  function attemptEarlyBailoutIfNoScheduledUpdate(
    current,
    workInProgress,
    renderLanes
  ) {
    switch (workInProgress.tag) {
      case 3:
        pushHostContainer(
          workInProgress,
          workInProgress.stateNode.containerInfo
        );
        pushProvider(workInProgress, CacheContext, current.memoizedState.cache);
        resetHydrationState();
        break;
      case 27:
      case 5:
        pushHostContext(workInProgress);
        break;
      case 4:
        pushHostContainer(
          workInProgress,
          workInProgress.stateNode.containerInfo
        );
        break;
      case 10:
        pushProvider(
          workInProgress,
          workInProgress.type,
          workInProgress.memoizedProps.value
        );
        break;
      case 12:
        0 !== (renderLanes & workInProgress.childLanes) &&
          (workInProgress.flags |= 4);
        var stateNode = workInProgress.stateNode;
        stateNode.effectDuration = 0;
        stateNode.passiveEffectDuration = 0;
        break;
      case 13:
        stateNode = workInProgress.memoizedState;
        if (null !== stateNode) {
          if (null !== stateNode.dehydrated)
            return (
              pushPrimaryTreeSuspenseHandler(workInProgress),
              (workInProgress.flags |= 128),
              null
            );
          if (0 !== (renderLanes & workInProgress.child.childLanes))
            return updateSuspenseComponent(
              current,
              workInProgress,
              renderLanes
            );
          pushPrimaryTreeSuspenseHandler(workInProgress);
          current = bailoutOnAlreadyFinishedWork(
            current,
            workInProgress,
            renderLanes
          );
          return null !== current ? current.sibling : null;
        }
        pushPrimaryTreeSuspenseHandler(workInProgress);
        break;
      case 19:
        stateNode = 0 !== (renderLanes & workInProgress.childLanes);
        if (0 !== (current.flags & 128)) {
          if (stateNode)
            return updateSuspenseListComponent(
              current,
              workInProgress,
              renderLanes
            );
          workInProgress.flags |= 128;
        }
        var renderState = workInProgress.memoizedState;
        null !== renderState &&
          ((renderState.rendering = null),
          (renderState.tail = null),
          (renderState.lastEffect = null));
        push(suspenseStackCursor, suspenseStackCursor.current);
        if (stateNode) break;
        else return null;
      case 22:
      case 23:
        return (
          (workInProgress.lanes = 0),
          updateOffscreenComponent(current, workInProgress, renderLanes)
        );
      case 24:
        pushProvider(workInProgress, CacheContext, current.memoizedState.cache);
    }
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }
  function beginWork(current, workInProgress, renderLanes) {
    if (null !== current)
      if (current.memoizedProps !== workInProgress.pendingProps)
        didReceiveUpdate = !0;
      else {
        if (
          0 === (current.lanes & renderLanes) &&
          0 === (workInProgress.flags & 128)
        )
          return (
            (didReceiveUpdate = !1),
            attemptEarlyBailoutIfNoScheduledUpdate(
              current,
              workInProgress,
              renderLanes
            )
          );
        didReceiveUpdate = 0 !== (current.flags & 131072) ? !0 : !1;
      }
    else
      (didReceiveUpdate = !1),
        isHydrating &&
          0 !== (workInProgress.flags & 1048576) &&
          pushTreeId(workInProgress, treeForkCount, workInProgress.index);
    workInProgress.lanes = 0;
    switch (workInProgress.tag) {
      case 16:
        a: {
          current = workInProgress.pendingProps;
          var lazyComponent = workInProgress.elementType,
            init = lazyComponent._init;
          lazyComponent = init(lazyComponent._payload);
          workInProgress.type = lazyComponent;
          if ("function" === typeof lazyComponent)
            shouldConstruct(lazyComponent)
              ? ((current = resolveClassComponentProps(lazyComponent, current)),
                (workInProgress.tag = 1),
                (workInProgress = updateClassComponent(
                  null,
                  workInProgress,
                  lazyComponent,
                  current,
                  renderLanes
                )))
              : ((workInProgress.tag = 0),
                (workInProgress = updateFunctionComponent(
                  null,
                  workInProgress,
                  lazyComponent,
                  current,
                  renderLanes
                )));
          else {
            if (void 0 !== lazyComponent && null !== lazyComponent)
              if (
                ((init = lazyComponent.$$typeof),
                init === REACT_FORWARD_REF_TYPE)
              ) {
                workInProgress.tag = 11;
                workInProgress = updateForwardRef(
                  null,
                  workInProgress,
                  lazyComponent,
                  current,
                  renderLanes
                );
                break a;
              } else if (init === REACT_MEMO_TYPE) {
                workInProgress.tag = 14;
                workInProgress = updateMemoComponent(
                  null,
                  workInProgress,
                  lazyComponent,
                  current,
                  renderLanes
                );
                break a;
              }
            throw Error(formatProdErrorMessage(306, lazyComponent, ""));
          }
        }
        return workInProgress;
      case 0:
        return updateFunctionComponent(
          current,
          workInProgress,
          workInProgress.type,
          workInProgress.pendingProps,
          renderLanes
        );
      case 1:
        return (
          (lazyComponent = workInProgress.type),
          (init = resolveClassComponentProps(
            lazyComponent,
            workInProgress.pendingProps
          )),
          updateClassComponent(
            current,
            workInProgress,
            lazyComponent,
            init,
            renderLanes
          )
        );
      case 3:
        a: {
          pushHostContainer(
            workInProgress,
            workInProgress.stateNode.containerInfo
          );
          if (null === current) throw Error(formatProdErrorMessage(387));
          var nextProps = workInProgress.pendingProps;
          init = workInProgress.memoizedState;
          lazyComponent = init.element;
          cloneUpdateQueue(current, workInProgress);
          processUpdateQueue(workInProgress, nextProps, null, renderLanes);
          var nextState = workInProgress.memoizedState;
          nextProps = nextState.cache;
          pushProvider(workInProgress, CacheContext, nextProps);
          nextProps !== init.cache &&
            propagateContextChange(workInProgress, CacheContext, renderLanes);
          suspendIfUpdateReadFromEntangledAsyncAction();
          nextProps = nextState.element;
          if (supportsHydration && init.isDehydrated)
            if (
              ((init = {
                element: nextProps,
                isDehydrated: !1,
                cache: nextState.cache
              }),
              (workInProgress.updateQueue.baseState = init),
              (workInProgress.memoizedState = init),
              workInProgress.flags & 256)
            ) {
              workInProgress = mountHostRootWithoutHydrating(
                current,
                workInProgress,
                nextProps,
                renderLanes
              );
              break a;
            } else if (nextProps !== lazyComponent) {
              lazyComponent = createCapturedValueAtFiber(
                Error(formatProdErrorMessage(424)),
                workInProgress
              );
              queueHydrationError(lazyComponent);
              workInProgress = mountHostRootWithoutHydrating(
                current,
                workInProgress,
                nextProps,
                renderLanes
              );
              break a;
            } else
              for (
                supportsHydration &&
                  ((nextHydratableInstance =
                    getFirstHydratableChildWithinContainer(
                      workInProgress.stateNode.containerInfo
                    )),
                  (hydrationParentFiber = workInProgress),
                  (isHydrating = !0),
                  (hydrationErrors = null),
                  (rootOrSingletonContext = !0)),
                  renderLanes = mountChildFibers(
                    workInProgress,
                    null,
                    nextProps,
                    renderLanes
                  ),
                  workInProgress.child = renderLanes;
                renderLanes;

              )
                (renderLanes.flags = (renderLanes.flags & -3) | 4096),
                  (renderLanes = renderLanes.sibling);
          else {
            resetHydrationState();
            if (nextProps === lazyComponent) {
              workInProgress = bailoutOnAlreadyFinishedWork(
                current,
                workInProgress,
                renderLanes
              );
              break a;
            }
            reconcileChildren(current, workInProgress, nextProps, renderLanes);
          }
          workInProgress = workInProgress.child;
        }
        return workInProgress;
      case 26:
        if (supportsResources)
          return (
            markRef(current, workInProgress),
            null === current
              ? (renderLanes = getResource(
                  workInProgress.type,
                  null,
                  workInProgress.pendingProps,
                  null
                ))
                ? (workInProgress.memoizedState = renderLanes)
                : isHydrating ||
                  (workInProgress.stateNode = createHoistableInstance(
                    workInProgress.type,
                    workInProgress.pendingProps,
                    rootInstanceStackCursor.current,
                    workInProgress
                  ))
              : (workInProgress.memoizedState = getResource(
                  workInProgress.type,
                  current.memoizedProps,
                  workInProgress.pendingProps,
                  current.memoizedState
                )),
            null
          );
      case 27:
        if (supportsSingletons)
          return (
            pushHostContext(workInProgress),
            null === current &&
              supportsSingletons &&
              isHydrating &&
              ((lazyComponent = workInProgress.stateNode =
                resolveSingletonInstance(
                  workInProgress.type,
                  workInProgress.pendingProps,
                  rootInstanceStackCursor.current,
                  contextStackCursor.current,
                  !1
                )),
              (hydrationParentFiber = workInProgress),
              (rootOrSingletonContext = !0),
              (nextHydratableInstance =
                getFirstHydratableChild(lazyComponent))),
            (lazyComponent = workInProgress.pendingProps.children),
            null !== current || isHydrating
              ? reconcileChildren(
                  current,
                  workInProgress,
                  lazyComponent,
                  renderLanes
                )
              : (workInProgress.child = reconcileChildFibers(
                  workInProgress,
                  null,
                  lazyComponent,
                  renderLanes
                )),
            markRef(current, workInProgress),
            workInProgress.child
          );
      case 5:
        if (null === current && isHydrating) {
          validateHydratableInstance(
            workInProgress.type,
            workInProgress.pendingProps,
            contextStackCursor.current
          );
          if ((init = lazyComponent = nextHydratableInstance))
            (lazyComponent = canHydrateInstance(
              lazyComponent,
              workInProgress.type,
              workInProgress.pendingProps,
              rootOrSingletonContext
            )),
              null !== lazyComponent
                ? ((workInProgress.stateNode = lazyComponent),
                  (hydrationParentFiber = workInProgress),
                  (nextHydratableInstance =
                    getFirstHydratableChild(lazyComponent)),
                  (rootOrSingletonContext = !1),
                  (init = !0))
                : (init = !1);
          init || throwOnHydrationMismatch(workInProgress);
        }
        pushHostContext(workInProgress);
        init = workInProgress.type;
        nextProps = workInProgress.pendingProps;
        nextState = null !== current ? current.memoizedProps : null;
        lazyComponent = nextProps.children;
        shouldSetTextContent(init, nextProps)
          ? (lazyComponent = null)
          : null !== nextState &&
            shouldSetTextContent(init, nextState) &&
            (workInProgress.flags |= 32);
        null !== workInProgress.memoizedState &&
          ((init = renderWithHooks(
            current,
            workInProgress,
            TransitionAwareHostComponent,
            null,
            null,
            renderLanes
          )),
          isPrimaryRenderer
            ? (HostTransitionContext._currentValue = init)
            : (HostTransitionContext._currentValue2 = init),
          didReceiveUpdate &&
            null !== current &&
            current.memoizedState.memoizedState !== init &&
            propagateContextChange(
              workInProgress,
              HostTransitionContext,
              renderLanes
            ));
        markRef(current, workInProgress);
        reconcileChildren(current, workInProgress, lazyComponent, renderLanes);
        return workInProgress.child;
      case 6:
        if (null === current && isHydrating) {
          validateHydratableTextInstance(
            workInProgress.pendingProps,
            contextStackCursor.current
          );
          if ((current = renderLanes = nextHydratableInstance))
            (renderLanes = canHydrateTextInstance(
              renderLanes,
              workInProgress.pendingProps,
              rootOrSingletonContext
            )),
              null !== renderLanes
                ? ((workInProgress.stateNode = renderLanes),
                  (hydrationParentFiber = workInProgress),
                  (nextHydratableInstance = null),
                  (current = !0))
                : (current = !1);
          current || throwOnHydrationMismatch(workInProgress);
        }
        return null;
      case 13:
        return updateSuspenseComponent(current, workInProgress, renderLanes);
      case 4:
        return (
          pushHostContainer(
            workInProgress,
            workInProgress.stateNode.containerInfo
          ),
          (lazyComponent = workInProgress.pendingProps),
          null === current
            ? (workInProgress.child = reconcileChildFibers(
                workInProgress,
                null,
                lazyComponent,
                renderLanes
              ))
            : reconcileChildren(
                current,
                workInProgress,
                lazyComponent,
                renderLanes
              ),
          workInProgress.child
        );
      case 11:
        return updateForwardRef(
          current,
          workInProgress,
          workInProgress.type,
          workInProgress.pendingProps,
          renderLanes
        );
      case 7:
        return (
          reconcileChildren(
            current,
            workInProgress,
            workInProgress.pendingProps,
            renderLanes
          ),
          workInProgress.child
        );
      case 8:
        return (
          reconcileChildren(
            current,
            workInProgress,
            workInProgress.pendingProps.children,
            renderLanes
          ),
          workInProgress.child
        );
      case 12:
        return (
          (workInProgress.flags |= 4),
          (lazyComponent = workInProgress.stateNode),
          (lazyComponent.effectDuration = 0),
          (lazyComponent.passiveEffectDuration = 0),
          reconcileChildren(
            current,
            workInProgress,
            workInProgress.pendingProps.children,
            renderLanes
          ),
          workInProgress.child
        );
      case 10:
        a: {
          lazyComponent = workInProgress.type;
          init = workInProgress.pendingProps;
          nextProps = workInProgress.memoizedProps;
          nextState = init.value;
          pushProvider(workInProgress, lazyComponent, nextState);
          if (null !== nextProps)
            if (objectIs(nextProps.value, nextState)) {
              if (nextProps.children === init.children) {
                workInProgress = bailoutOnAlreadyFinishedWork(
                  current,
                  workInProgress,
                  renderLanes
                );
                break a;
              }
            } else
              propagateContextChange(
                workInProgress,
                lazyComponent,
                renderLanes
              );
          reconcileChildren(
            current,
            workInProgress,
            init.children,
            renderLanes
          );
          workInProgress = workInProgress.child;
        }
        return workInProgress;
      case 9:
        return (
          (init = workInProgress.type._context),
          (lazyComponent = workInProgress.pendingProps.children),
          prepareToReadContext(workInProgress, renderLanes),
          (init = readContext(init)),
          markComponentRenderStarted(workInProgress),
          (lazyComponent = lazyComponent(init)),
          markComponentRenderStopped(),
          (workInProgress.flags |= 1),
          reconcileChildren(
            current,
            workInProgress,
            lazyComponent,
            renderLanes
          ),
          workInProgress.child
        );
      case 14:
        return updateMemoComponent(
          current,
          workInProgress,
          workInProgress.type,
          workInProgress.pendingProps,
          renderLanes
        );
      case 15:
        return updateSimpleMemoComponent(
          current,
          workInProgress,
          workInProgress.type,
          workInProgress.pendingProps,
          renderLanes
        );
      case 19:
        return updateSuspenseListComponent(
          current,
          workInProgress,
          renderLanes
        );
      case 22:
        return updateOffscreenComponent(current, workInProgress, renderLanes);
      case 24:
        return (
          prepareToReadContext(workInProgress, renderLanes),
          (lazyComponent = readContext(CacheContext)),
          null === current
            ? ((init = peekCacheFromPool()),
              null === init &&
                ((init = workInProgressRoot),
                (nextProps = createCache()),
                (init.pooledCache = nextProps),
                nextProps.refCount++,
                null !== nextProps && (init.pooledCacheLanes |= renderLanes),
                (init = nextProps)),
              (workInProgress.memoizedState = {
                parent: lazyComponent,
                cache: init
              }),
              initializeUpdateQueue(workInProgress),
              pushProvider(workInProgress, CacheContext, init))
            : (0 !== (current.lanes & renderLanes) &&
                (cloneUpdateQueue(current, workInProgress),
                processUpdateQueue(workInProgress, null, null, renderLanes),
                suspendIfUpdateReadFromEntangledAsyncAction()),
              (init = current.memoizedState),
              (nextProps = workInProgress.memoizedState),
              init.parent !== lazyComponent
                ? ((init = { parent: lazyComponent, cache: lazyComponent }),
                  (workInProgress.memoizedState = init),
                  0 === workInProgress.lanes &&
                    (workInProgress.memoizedState =
                      workInProgress.updateQueue.baseState =
                        init),
                  pushProvider(workInProgress, CacheContext, lazyComponent))
                : ((lazyComponent = nextProps.cache),
                  pushProvider(workInProgress, CacheContext, lazyComponent),
                  lazyComponent !== init.cache &&
                    propagateContextChange(
                      workInProgress,
                      CacheContext,
                      renderLanes
                    ))),
          reconcileChildren(
            current,
            workInProgress,
            workInProgress.pendingProps.children,
            renderLanes
          ),
          workInProgress.child
        );
      case 29:
        throw workInProgress.pendingProps;
    }
    throw Error(formatProdErrorMessage(156, workInProgress.tag));
  }
  function resetContextDependencies() {
    lastFullyObservedContext =
      lastContextDependency =
      currentlyRenderingFiber =
        null;
  }
  function pushProvider(providerFiber, context, nextValue) {
    isPrimaryRenderer
      ? (push(valueCursor, context._currentValue),
        (context._currentValue = nextValue))
      : (push(valueCursor, context._currentValue2),
        (context._currentValue2 = nextValue));
  }
  function popProvider(context) {
    var currentValue = valueCursor.current;
    isPrimaryRenderer
      ? (context._currentValue = currentValue)
      : (context._currentValue2 = currentValue);
    pop(valueCursor);
  }
  function scheduleContextWorkOnParentPath(
    parent,
    renderLanes,
    propagationRoot
  ) {
    for (; null !== parent; ) {
      var alternate = parent.alternate;
      (parent.childLanes & renderLanes) !== renderLanes
        ? ((parent.childLanes |= renderLanes),
          null !== alternate && (alternate.childLanes |= renderLanes))
        : null !== alternate &&
          (alternate.childLanes & renderLanes) !== renderLanes &&
          (alternate.childLanes |= renderLanes);
      if (parent === propagationRoot) break;
      parent = parent.return;
    }
  }
  function propagateContextChange(workInProgress, context, renderLanes) {
    var fiber = workInProgress.child;
    null !== fiber && (fiber.return = workInProgress);
    for (; null !== fiber; ) {
      var list = fiber.dependencies;
      if (null !== list) {
        var nextFiber = fiber.child;
        for (var dependency = list.firstContext; null !== dependency; ) {
          if (dependency.context === context) {
            if (1 === fiber.tag) {
              dependency = createUpdate(renderLanes & -renderLanes);
              dependency.tag = 2;
              var updateQueue = fiber.updateQueue;
              if (null !== updateQueue) {
                updateQueue = updateQueue.shared;
                var pending = updateQueue.pending;
                null === pending
                  ? (dependency.next = dependency)
                  : ((dependency.next = pending.next),
                    (pending.next = dependency));
                updateQueue.pending = dependency;
              }
            }
            fiber.lanes |= renderLanes;
            dependency = fiber.alternate;
            null !== dependency && (dependency.lanes |= renderLanes);
            scheduleContextWorkOnParentPath(
              fiber.return,
              renderLanes,
              workInProgress
            );
            list.lanes |= renderLanes;
            break;
          }
          dependency = dependency.next;
        }
      } else if (10 === fiber.tag)
        nextFiber = fiber.type === workInProgress.type ? null : fiber.child;
      else if (18 === fiber.tag) {
        nextFiber = fiber.return;
        if (null === nextFiber) throw Error(formatProdErrorMessage(341));
        nextFiber.lanes |= renderLanes;
        list = nextFiber.alternate;
        null !== list && (list.lanes |= renderLanes);
        scheduleContextWorkOnParentPath(nextFiber, renderLanes, workInProgress);
        nextFiber = fiber.sibling;
      } else nextFiber = fiber.child;
      if (null !== nextFiber) nextFiber.return = fiber;
      else
        for (nextFiber = fiber; null !== nextFiber; ) {
          if (nextFiber === workInProgress) {
            nextFiber = null;
            break;
          }
          fiber = nextFiber.sibling;
          if (null !== fiber) {
            fiber.return = nextFiber.return;
            nextFiber = fiber;
            break;
          }
          nextFiber = nextFiber.return;
        }
      fiber = nextFiber;
    }
  }
  function prepareToReadContext(workInProgress, renderLanes) {
    currentlyRenderingFiber = workInProgress;
    lastFullyObservedContext = lastContextDependency = null;
    workInProgress = workInProgress.dependencies;
    null !== workInProgress &&
      null !== workInProgress.firstContext &&
      (0 !== (workInProgress.lanes & renderLanes) && (didReceiveUpdate = !0),
      (workInProgress.firstContext = null));
  }
  function readContext(context) {
    return readContextForConsumer(currentlyRenderingFiber, context);
  }
  function readContextDuringReconciliation(consumer, context, renderLanes) {
    null === currentlyRenderingFiber &&
      prepareToReadContext(consumer, renderLanes);
    return readContextForConsumer(consumer, context);
  }
  function readContextForConsumer(consumer, context) {
    var value = isPrimaryRenderer
      ? context._currentValue
      : context._currentValue2;
    if (lastFullyObservedContext !== context)
      if (
        ((context = { context: context, memoizedValue: value, next: null }),
        null === lastContextDependency)
      ) {
        if (null === consumer) throw Error(formatProdErrorMessage(308));
        lastContextDependency = context;
        consumer.dependencies = { lanes: 0, firstContext: context };
      } else lastContextDependency = lastContextDependency.next = context;
    return value;
  }
  function createCache() {
    return {
      controller: new AbortControllerLocal(),
      data: new Map(),
      refCount: 0
    };
  }
  function releaseCache(cache) {
    cache.refCount--;
    0 === cache.refCount &&
      scheduleCallback$1(NormalPriority, function () {
        cache.controller.abort();
      });
  }
  function peekCacheFromPool() {
    var cacheResumedFromPreviousRender = resumedCache.current;
    return null !== cacheResumedFromPreviousRender
      ? cacheResumedFromPreviousRender
      : workInProgressRoot.pooledCache;
  }
  function pushTransition(offscreenWorkInProgress, prevCachePool) {
    null === prevCachePool
      ? push(resumedCache, resumedCache.current)
      : push(resumedCache, prevCachePool.pool);
  }
  function getSuspendedCache() {
    var cacheFromPool = peekCacheFromPool();
    return null === cacheFromPool
      ? null
      : {
          parent: isPrimaryRenderer
            ? CacheContext._currentValue
            : CacheContext._currentValue2,
          pool: cacheFromPool
        };
  }
  function markUpdate(workInProgress) {
    workInProgress.flags |= 4;
  }
  function doesRequireClone(current, completedWork) {
    if (null !== current && current.child === completedWork.child) return !1;
    if (0 !== (completedWork.flags & 16)) return !0;
    for (current = completedWork.child; null !== current; ) {
      if (0 !== (current.flags & 13878) || 0 !== (current.subtreeFlags & 13878))
        return !0;
      current = current.sibling;
    }
    return !1;
  }
  function appendAllChildren(
    parent,
    workInProgress,
    needsVisibilityToggle,
    isHidden
  ) {
    if (supportsMutation)
      for (
        needsVisibilityToggle = workInProgress.child;
        null !== needsVisibilityToggle;

      ) {
        if (5 === needsVisibilityToggle.tag || 6 === needsVisibilityToggle.tag)
          appendInitialChild(parent, needsVisibilityToggle.stateNode);
        else if (
          !(
            4 === needsVisibilityToggle.tag ||
            (supportsSingletons && 27 === needsVisibilityToggle.tag)
          ) &&
          null !== needsVisibilityToggle.child
        ) {
          needsVisibilityToggle.child.return = needsVisibilityToggle;
          needsVisibilityToggle = needsVisibilityToggle.child;
          continue;
        }
        if (needsVisibilityToggle === workInProgress) break;
        for (; null === needsVisibilityToggle.sibling; ) {
          if (
            null === needsVisibilityToggle.return ||
            needsVisibilityToggle.return === workInProgress
          )
            return;
          needsVisibilityToggle = needsVisibilityToggle.return;
        }
        needsVisibilityToggle.sibling.return = needsVisibilityToggle.return;
        needsVisibilityToggle = needsVisibilityToggle.sibling;
      }
    else if (supportsPersistence)
      for (var node$91 = workInProgress.child; null !== node$91; ) {
        if (5 === node$91.tag) {
          var instance = node$91.stateNode;
          needsVisibilityToggle &&
            isHidden &&
            (instance = cloneHiddenInstance(
              instance,
              node$91.type,
              node$91.memoizedProps
            ));
          appendInitialChild(parent, instance);
        } else if (6 === node$91.tag)
          (instance = node$91.stateNode),
            needsVisibilityToggle &&
              isHidden &&
              (instance = cloneHiddenTextInstance(
                instance,
                node$91.memoizedProps
              )),
            appendInitialChild(parent, instance);
        else if (4 !== node$91.tag)
          if (22 === node$91.tag && null !== node$91.memoizedState)
            (instance = node$91.child),
              null !== instance && (instance.return = node$91),
              appendAllChildren(parent, node$91, !0, !0);
          else if (null !== node$91.child) {
            node$91.child.return = node$91;
            node$91 = node$91.child;
            continue;
          }
        if (node$91 === workInProgress) break;
        for (; null === node$91.sibling; ) {
          if (null === node$91.return || node$91.return === workInProgress)
            return;
          node$91 = node$91.return;
        }
        node$91.sibling.return = node$91.return;
        node$91 = node$91.sibling;
      }
  }
  function appendAllChildrenToContainer(
    containerChildSet,
    workInProgress,
    needsVisibilityToggle,
    isHidden
  ) {
    if (supportsPersistence)
      for (var node = workInProgress.child; null !== node; ) {
        if (5 === node.tag) {
          var instance = node.stateNode;
          needsVisibilityToggle &&
            isHidden &&
            (instance = cloneHiddenInstance(
              instance,
              node.type,
              node.memoizedProps
            ));
          appendChildToContainerChildSet(containerChildSet, instance);
        } else if (6 === node.tag)
          (instance = node.stateNode),
            needsVisibilityToggle &&
              isHidden &&
              (instance = cloneHiddenTextInstance(
                instance,
                node.memoizedProps
              )),
            appendChildToContainerChildSet(containerChildSet, instance);
        else if (4 !== node.tag)
          if (22 === node.tag && null !== node.memoizedState)
            (instance = node.child),
              null !== instance && (instance.return = node),
              appendAllChildrenToContainer(
                containerChildSet,
                node,
                !(
                  null !== node.memoizedProps &&
                  "manual" === node.memoizedProps.mode
                ),
                !0
              );
          else if (null !== node.child) {
            node.child.return = node;
            node = node.child;
            continue;
          }
        if (node === workInProgress) break;
        for (; null === node.sibling; ) {
          if (null === node.return || node.return === workInProgress) return;
          node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
      }
  }
  function updateHostContainer(current, workInProgress) {
    if (supportsPersistence && doesRequireClone(current, workInProgress)) {
      current = workInProgress.stateNode;
      var container = current.containerInfo,
        newChildSet = createContainerChildSet();
      appendAllChildrenToContainer(newChildSet, workInProgress, !1, !1);
      current.pendingChildren = newChildSet;
      markUpdate(workInProgress);
      finalizeContainerChildren(container, newChildSet);
    }
  }
  function updateHostComponent(current, workInProgress, type, newProps) {
    if (supportsMutation)
      current.memoizedProps !== newProps && markUpdate(workInProgress);
    else if (supportsPersistence) {
      var currentInstance = current.stateNode,
        oldProps$94 = current.memoizedProps;
      if (
        (current = doesRequireClone(current, workInProgress)) ||
        oldProps$94 !== newProps
      ) {
        var currentHostContext = contextStackCursor.current;
        oldProps$94 = cloneInstance(
          currentInstance,
          type,
          oldProps$94,
          newProps,
          !current,
          null
        );
        oldProps$94 === currentInstance
          ? (workInProgress.stateNode = currentInstance)
          : (finalizeInitialChildren(
              oldProps$94,
              type,
              newProps,
              currentHostContext
            ) && markUpdate(workInProgress),
            (workInProgress.stateNode = oldProps$94),
            current
              ? appendAllChildren(oldProps$94, workInProgress, !1, !1)
              : markUpdate(workInProgress));
      } else workInProgress.stateNode = currentInstance;
    }
  }
  function preloadInstanceAndSuspendIfNeeded(workInProgress, type, props) {
    if (maySuspendCommit(type, props)) {
      if (((workInProgress.flags |= 16777216), !preloadInstance(type, props)))
        if (shouldRemainOnPreviousScreen()) workInProgress.flags |= 8192;
        else
          throw (
            ((suspendedThenable = noopSuspenseyCommitThenable),
            SuspenseyCommitException)
          );
    } else workInProgress.flags &= -16777217;
  }
  function preloadResourceAndSuspendIfNeeded(workInProgress, resource) {
    if (mayResourceSuspendCommit(resource)) {
      if (((workInProgress.flags |= 16777216), !preloadResource(resource)))
        if (shouldRemainOnPreviousScreen()) workInProgress.flags |= 8192;
        else
          throw (
            ((suspendedThenable = noopSuspenseyCommitThenable),
            SuspenseyCommitException)
          );
    } else workInProgress.flags &= -16777217;
  }
  function scheduleRetryEffect(workInProgress, retryQueue) {
    null !== retryQueue
      ? (workInProgress.flags |= 4)
      : workInProgress.flags & 16384 &&
        ((retryQueue =
          22 !== workInProgress.tag ? claimNextRetryLane() : 536870912),
        (workInProgress.lanes |= retryQueue));
  }
  function cutOffTailIfNeeded(renderState, hasRenderedATailFallback) {
    if (!isHydrating)
      switch (renderState.tailMode) {
        case "hidden":
          hasRenderedATailFallback = renderState.tail;
          for (var lastTailNode = null; null !== hasRenderedATailFallback; )
            null !== hasRenderedATailFallback.alternate &&
              (lastTailNode = hasRenderedATailFallback),
              (hasRenderedATailFallback = hasRenderedATailFallback.sibling);
          null === lastTailNode
            ? (renderState.tail = null)
            : (lastTailNode.sibling = null);
          break;
        case "collapsed":
          lastTailNode = renderState.tail;
          for (var lastTailNode$96 = null; null !== lastTailNode; )
            null !== lastTailNode.alternate && (lastTailNode$96 = lastTailNode),
              (lastTailNode = lastTailNode.sibling);
          null === lastTailNode$96
            ? hasRenderedATailFallback || null === renderState.tail
              ? (renderState.tail = null)
              : (renderState.tail.sibling = null)
            : (lastTailNode$96.sibling = null);
      }
  }
  function bubbleProperties(completedWork) {
    var didBailout =
        null !== completedWork.alternate &&
        completedWork.alternate.child === completedWork.child,
      newChildLanes = 0,
      subtreeFlags = 0;
    if (didBailout)
      if (0 !== (completedWork.mode & 2)) {
        for (
          var treeBaseDuration$98 = completedWork.selfBaseDuration,
            child$99 = completedWork.child;
          null !== child$99;

        )
          (newChildLanes |= child$99.lanes | child$99.childLanes),
            (subtreeFlags |= child$99.subtreeFlags & 31457280),
            (subtreeFlags |= child$99.flags & 31457280),
            (treeBaseDuration$98 += child$99.treeBaseDuration),
            (child$99 = child$99.sibling);
        completedWork.treeBaseDuration = treeBaseDuration$98;
      } else
        for (
          treeBaseDuration$98 = completedWork.child;
          null !== treeBaseDuration$98;

        )
          (newChildLanes |=
            treeBaseDuration$98.lanes | treeBaseDuration$98.childLanes),
            (subtreeFlags |= treeBaseDuration$98.subtreeFlags & 31457280),
            (subtreeFlags |= treeBaseDuration$98.flags & 31457280),
            (treeBaseDuration$98.return = completedWork),
            (treeBaseDuration$98 = treeBaseDuration$98.sibling);
    else if (0 !== (completedWork.mode & 2)) {
      treeBaseDuration$98 = completedWork.actualDuration;
      child$99 = completedWork.selfBaseDuration;
      for (var child = completedWork.child; null !== child; )
        (newChildLanes |= child.lanes | child.childLanes),
          (subtreeFlags |= child.subtreeFlags),
          (subtreeFlags |= child.flags),
          (treeBaseDuration$98 += child.actualDuration),
          (child$99 += child.treeBaseDuration),
          (child = child.sibling);
      completedWork.actualDuration = treeBaseDuration$98;
      completedWork.treeBaseDuration = child$99;
    } else
      for (
        treeBaseDuration$98 = completedWork.child;
        null !== treeBaseDuration$98;

      )
        (newChildLanes |=
          treeBaseDuration$98.lanes | treeBaseDuration$98.childLanes),
          (subtreeFlags |= treeBaseDuration$98.subtreeFlags),
          (subtreeFlags |= treeBaseDuration$98.flags),
          (treeBaseDuration$98.return = completedWork),
          (treeBaseDuration$98 = treeBaseDuration$98.sibling);
    completedWork.subtreeFlags |= subtreeFlags;
    completedWork.childLanes = newChildLanes;
    return didBailout;
  }
  function completeWork(current, workInProgress, renderLanes) {
    var newProps = workInProgress.pendingProps;
    popTreeContext(workInProgress);
    switch (workInProgress.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return bubbleProperties(workInProgress), null;
      case 1:
        return bubbleProperties(workInProgress), null;
      case 3:
        renderLanes = workInProgress.stateNode;
        newProps = null;
        null !== current && (newProps = current.memoizedState.cache);
        workInProgress.memoizedState.cache !== newProps &&
          (workInProgress.flags |= 2048);
        popProvider(CacheContext);
        popHostContainer();
        renderLanes.pendingContext &&
          ((renderLanes.context = renderLanes.pendingContext),
          (renderLanes.pendingContext = null));
        if (null === current || null === current.child)
          popHydrationState(workInProgress)
            ? markUpdate(workInProgress)
            : null === current ||
              (current.memoizedState.isDehydrated &&
                0 === (workInProgress.flags & 256)) ||
              ((workInProgress.flags |= 1024),
              null !== hydrationErrors &&
                (queueRecoverableErrors(hydrationErrors),
                (hydrationErrors = null)));
        updateHostContainer(current, workInProgress);
        bubbleProperties(workInProgress);
        return null;
      case 26:
        if (supportsResources) {
          renderLanes = workInProgress.type;
          var nextResource = workInProgress.memoizedState;
          null === current
            ? (markUpdate(workInProgress),
              null !== nextResource
                ? (bubbleProperties(workInProgress),
                  preloadResourceAndSuspendIfNeeded(
                    workInProgress,
                    nextResource
                  ))
                : (bubbleProperties(workInProgress),
                  preloadInstanceAndSuspendIfNeeded(
                    workInProgress,
                    renderLanes,
                    newProps
                  )))
            : nextResource
            ? nextResource !== current.memoizedState
              ? (markUpdate(workInProgress),
                bubbleProperties(workInProgress),
                preloadResourceAndSuspendIfNeeded(workInProgress, nextResource))
              : (bubbleProperties(workInProgress),
                (workInProgress.flags &= -16777217))
            : (supportsMutation
                ? current.memoizedProps !== newProps &&
                  markUpdate(workInProgress)
                : updateHostComponent(
                    current,
                    workInProgress,
                    renderLanes,
                    newProps
                  ),
              bubbleProperties(workInProgress),
              preloadInstanceAndSuspendIfNeeded(
                workInProgress,
                renderLanes,
                newProps
              ));
          return null;
        }
      case 27:
        if (supportsSingletons) {
          popHostContext(workInProgress);
          renderLanes = rootInstanceStackCursor.current;
          nextResource = workInProgress.type;
          if (null !== current && null != workInProgress.stateNode)
            supportsMutation
              ? current.memoizedProps !== newProps && markUpdate(workInProgress)
              : updateHostComponent(
                  current,
                  workInProgress,
                  nextResource,
                  newProps
                );
          else {
            if (!newProps) {
              if (null === workInProgress.stateNode)
                throw Error(formatProdErrorMessage(166));
              bubbleProperties(workInProgress);
              return null;
            }
            current = contextStackCursor.current;
            popHydrationState(workInProgress)
              ? prepareToHydrateHostInstance(workInProgress, current)
              : ((current = resolveSingletonInstance(
                  nextResource,
                  newProps,
                  renderLanes,
                  current,
                  !0
                )),
                (workInProgress.stateNode = current),
                markUpdate(workInProgress));
          }
          bubbleProperties(workInProgress);
          return null;
        }
      case 5:
        popHostContext(workInProgress);
        renderLanes = workInProgress.type;
        if (null !== current && null != workInProgress.stateNode)
          updateHostComponent(current, workInProgress, renderLanes, newProps);
        else {
          if (!newProps) {
            if (null === workInProgress.stateNode)
              throw Error(formatProdErrorMessage(166));
            bubbleProperties(workInProgress);
            return null;
          }
          current = contextStackCursor.current;
          popHydrationState(workInProgress)
            ? prepareToHydrateHostInstance(workInProgress, current)
            : ((nextResource = createInstance(
                renderLanes,
                newProps,
                rootInstanceStackCursor.current,
                current,
                workInProgress
              )),
              appendAllChildren(nextResource, workInProgress, !1, !1),
              (workInProgress.stateNode = nextResource),
              finalizeInitialChildren(
                nextResource,
                renderLanes,
                newProps,
                current
              ) && markUpdate(workInProgress));
        }
        bubbleProperties(workInProgress);
        preloadInstanceAndSuspendIfNeeded(
          workInProgress,
          workInProgress.type,
          workInProgress.pendingProps
        );
        return null;
      case 6:
        if (current && null != workInProgress.stateNode)
          (renderLanes = current.memoizedProps),
            supportsMutation
              ? renderLanes !== newProps && markUpdate(workInProgress)
              : supportsPersistence &&
                (renderLanes !== newProps
                  ? ((workInProgress.stateNode = createTextInstance(
                      newProps,
                      rootInstanceStackCursor.current,
                      contextStackCursor.current,
                      workInProgress
                    )),
                    markUpdate(workInProgress))
                  : (workInProgress.stateNode = current.stateNode));
        else {
          if ("string" !== typeof newProps && null === workInProgress.stateNode)
            throw Error(formatProdErrorMessage(166));
          current = rootInstanceStackCursor.current;
          renderLanes = contextStackCursor.current;
          if (popHydrationState(workInProgress)) {
            if (!supportsHydration) throw Error(formatProdErrorMessage(176));
            current = workInProgress.stateNode;
            renderLanes = workInProgress.memoizedProps;
            newProps = null;
            nextResource = hydrationParentFiber;
            if (null !== nextResource)
              switch (nextResource.tag) {
                case 27:
                case 5:
                  newProps = nextResource.memoizedProps;
              }
            hydrateTextInstance(
              current,
              renderLanes,
              workInProgress,
              newProps
            ) || throwOnHydrationMismatch(workInProgress);
          } else
            workInProgress.stateNode = createTextInstance(
              newProps,
              current,
              renderLanes,
              workInProgress
            );
        }
        bubbleProperties(workInProgress);
        return null;
      case 13:
        newProps = workInProgress.memoizedState;
        if (
          null === current ||
          (null !== current.memoizedState &&
            null !== current.memoizedState.dehydrated)
        ) {
          nextResource = popHydrationState(workInProgress);
          if (null !== newProps && null !== newProps.dehydrated) {
            if (null === current) {
              if (!nextResource) throw Error(formatProdErrorMessage(318));
              if (!supportsHydration) throw Error(formatProdErrorMessage(344));
              nextResource = workInProgress.memoizedState;
              nextResource =
                null !== nextResource ? nextResource.dehydrated : null;
              if (!nextResource) throw Error(formatProdErrorMessage(317));
              hydrateSuspenseInstance(nextResource, workInProgress);
              bubbleProperties(workInProgress);
              0 !== (workInProgress.mode & 2) &&
                null !== newProps &&
                ((nextResource = workInProgress.child),
                null !== nextResource &&
                  (workInProgress.treeBaseDuration -=
                    nextResource.treeBaseDuration));
            } else
              resetHydrationState(),
                0 === (workInProgress.flags & 128) &&
                  (workInProgress.memoizedState = null),
                (workInProgress.flags |= 4),
                bubbleProperties(workInProgress),
                0 !== (workInProgress.mode & 2) &&
                  null !== newProps &&
                  ((nextResource = workInProgress.child),
                  null !== nextResource &&
                    (workInProgress.treeBaseDuration -=
                      nextResource.treeBaseDuration));
            nextResource = !1;
          } else
            null !== hydrationErrors &&
              (queueRecoverableErrors(hydrationErrors),
              (hydrationErrors = null)),
              (nextResource = !0);
          if (!nextResource) {
            if (workInProgress.flags & 256)
              return popSuspenseHandler(workInProgress), workInProgress;
            popSuspenseHandler(workInProgress);
            return null;
          }
        }
        popSuspenseHandler(workInProgress);
        if (0 !== (workInProgress.flags & 128))
          return (
            (workInProgress.lanes = renderLanes),
            0 !== (workInProgress.mode & 2) &&
              transferActualDuration(workInProgress),
            workInProgress
          );
        renderLanes = null !== newProps;
        current = null !== current && null !== current.memoizedState;
        if (renderLanes) {
          newProps = workInProgress.child;
          nextResource = null;
          null !== newProps.alternate &&
            null !== newProps.alternate.memoizedState &&
            null !== newProps.alternate.memoizedState.cachePool &&
            (nextResource = newProps.alternate.memoizedState.cachePool.pool);
          var cache$115 = null;
          null !== newProps.memoizedState &&
            null !== newProps.memoizedState.cachePool &&
            (cache$115 = newProps.memoizedState.cachePool.pool);
          cache$115 !== nextResource && (newProps.flags |= 2048);
        }
        renderLanes !== current &&
          renderLanes &&
          (workInProgress.child.flags |= 8192);
        scheduleRetryEffect(workInProgress, workInProgress.updateQueue);
        bubbleProperties(workInProgress);
        0 !== (workInProgress.mode & 2) &&
          renderLanes &&
          ((current = workInProgress.child),
          null !== current &&
            (workInProgress.treeBaseDuration -= current.treeBaseDuration));
        return null;
      case 4:
        return (
          popHostContainer(),
          updateHostContainer(current, workInProgress),
          null === current &&
            preparePortalMount(workInProgress.stateNode.containerInfo),
          bubbleProperties(workInProgress),
          null
        );
      case 10:
        return (
          popProvider(workInProgress.type),
          bubbleProperties(workInProgress),
          null
        );
      case 19:
        pop(suspenseStackCursor);
        nextResource = workInProgress.memoizedState;
        if (null === nextResource)
          return bubbleProperties(workInProgress), null;
        newProps = 0 !== (workInProgress.flags & 128);
        cache$115 = nextResource.rendering;
        if (null === cache$115)
          if (newProps) cutOffTailIfNeeded(nextResource, !1);
          else {
            if (
              0 !== workInProgressRootExitStatus ||
              (null !== current && 0 !== (current.flags & 128))
            )
              for (current = workInProgress.child; null !== current; ) {
                cache$115 = findFirstSuspended(current);
                if (null !== cache$115) {
                  workInProgress.flags |= 128;
                  cutOffTailIfNeeded(nextResource, !1);
                  current = cache$115.updateQueue;
                  workInProgress.updateQueue = current;
                  scheduleRetryEffect(workInProgress, current);
                  workInProgress.subtreeFlags = 0;
                  current = renderLanes;
                  for (
                    renderLanes = workInProgress.child;
                    null !== renderLanes;

                  )
                    resetWorkInProgress(renderLanes, current),
                      (renderLanes = renderLanes.sibling);
                  push(
                    suspenseStackCursor,
                    (suspenseStackCursor.current & 1) | 2
                  );
                  return workInProgress.child;
                }
                current = current.sibling;
              }
            null !== nextResource.tail &&
              now$1() > workInProgressRootRenderTargetTime &&
              ((workInProgress.flags |= 128),
              (newProps = !0),
              cutOffTailIfNeeded(nextResource, !1),
              (workInProgress.lanes = 4194304));
          }
        else {
          if (!newProps)
            if (((current = findFirstSuspended(cache$115)), null !== current)) {
              if (
                ((workInProgress.flags |= 128),
                (newProps = !0),
                (current = current.updateQueue),
                (workInProgress.updateQueue = current),
                scheduleRetryEffect(workInProgress, current),
                cutOffTailIfNeeded(nextResource, !0),
                null === nextResource.tail &&
                  "hidden" === nextResource.tailMode &&
                  !cache$115.alternate &&
                  !isHydrating)
              )
                return bubbleProperties(workInProgress), null;
            } else
              2 * now$1() - nextResource.renderingStartTime >
                workInProgressRootRenderTargetTime &&
                536870912 !== renderLanes &&
                ((workInProgress.flags |= 128),
                (newProps = !0),
                cutOffTailIfNeeded(nextResource, !1),
                (workInProgress.lanes = 4194304));
          nextResource.isBackwards
            ? ((cache$115.sibling = workInProgress.child),
              (workInProgress.child = cache$115))
            : ((current = nextResource.last),
              null !== current
                ? (current.sibling = cache$115)
                : (workInProgress.child = cache$115),
              (nextResource.last = cache$115));
        }
        if (null !== nextResource.tail)
          return (
            (workInProgress = nextResource.tail),
            (nextResource.rendering = workInProgress),
            (nextResource.tail = workInProgress.sibling),
            (nextResource.renderingStartTime = now$1()),
            (workInProgress.sibling = null),
            (current = suspenseStackCursor.current),
            push(
              suspenseStackCursor,
              newProps ? (current & 1) | 2 : current & 1
            ),
            workInProgress
          );
        bubbleProperties(workInProgress);
        return null;
      case 22:
      case 23:
        return (
          popSuspenseHandler(workInProgress),
          popHiddenContext(),
          (newProps = null !== workInProgress.memoizedState),
          null !== current
            ? (null !== current.memoizedState) !== newProps &&
              (workInProgress.flags |= 8192)
            : newProps && (workInProgress.flags |= 8192),
          newProps
            ? 0 !== (renderLanes & 536870912) &&
              0 === (workInProgress.flags & 128) &&
              (bubbleProperties(workInProgress),
              workInProgress.subtreeFlags & 6 && (workInProgress.flags |= 8192))
            : bubbleProperties(workInProgress),
          (renderLanes = workInProgress.updateQueue),
          null !== renderLanes &&
            scheduleRetryEffect(workInProgress, renderLanes.retryQueue),
          (renderLanes = null),
          null !== current &&
            null !== current.memoizedState &&
            null !== current.memoizedState.cachePool &&
            (renderLanes = current.memoizedState.cachePool.pool),
          (newProps = null),
          null !== workInProgress.memoizedState &&
            null !== workInProgress.memoizedState.cachePool &&
            (newProps = workInProgress.memoizedState.cachePool.pool),
          newProps !== renderLanes && (workInProgress.flags |= 2048),
          null !== current && pop(resumedCache),
          null
        );
      case 24:
        return (
          (renderLanes = null),
          null !== current && (renderLanes = current.memoizedState.cache),
          workInProgress.memoizedState.cache !== renderLanes &&
            (workInProgress.flags |= 2048),
          popProvider(CacheContext),
          bubbleProperties(workInProgress),
          null
        );
      case 25:
        return null;
    }
    throw Error(formatProdErrorMessage(156, workInProgress.tag));
  }
  function unwindWork(current, workInProgress) {
    popTreeContext(workInProgress);
    switch (workInProgress.tag) {
      case 1:
        return (
          (current = workInProgress.flags),
          current & 65536
            ? ((workInProgress.flags = (current & -65537) | 128),
              0 !== (workInProgress.mode & 2) &&
                transferActualDuration(workInProgress),
              workInProgress)
            : null
        );
      case 3:
        return (
          popProvider(CacheContext),
          popHostContainer(),
          (current = workInProgress.flags),
          0 !== (current & 65536) && 0 === (current & 128)
            ? ((workInProgress.flags = (current & -65537) | 128),
              workInProgress)
            : null
        );
      case 26:
      case 27:
      case 5:
        return popHostContext(workInProgress), null;
      case 13:
        popSuspenseHandler(workInProgress);
        current = workInProgress.memoizedState;
        if (null !== current && null !== current.dehydrated) {
          if (null === workInProgress.alternate)
            throw Error(formatProdErrorMessage(340));
          resetHydrationState();
        }
        current = workInProgress.flags;
        return current & 65536
          ? ((workInProgress.flags = (current & -65537) | 128),
            0 !== (workInProgress.mode & 2) &&
              transferActualDuration(workInProgress),
            workInProgress)
          : null;
      case 19:
        return pop(suspenseStackCursor), null;
      case 4:
        return popHostContainer(), null;
      case 10:
        return popProvider(workInProgress.type), null;
      case 22:
      case 23:
        return (
          popSuspenseHandler(workInProgress),
          popHiddenContext(),
          null !== current && pop(resumedCache),
          (current = workInProgress.flags),
          current & 65536
            ? ((workInProgress.flags = (current & -65537) | 128),
              0 !== (workInProgress.mode & 2) &&
                transferActualDuration(workInProgress),
              workInProgress)
            : null
        );
      case 24:
        return popProvider(CacheContext), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function unwindInterruptedWork(current, interruptedWork) {
    popTreeContext(interruptedWork);
    switch (interruptedWork.tag) {
      case 3:
        popProvider(CacheContext);
        popHostContainer();
        break;
      case 26:
      case 27:
      case 5:
        popHostContext(interruptedWork);
        break;
      case 4:
        popHostContainer();
        break;
      case 13:
        popSuspenseHandler(interruptedWork);
        break;
      case 19:
        pop(suspenseStackCursor);
        break;
      case 10:
        popProvider(interruptedWork.type);
        break;
      case 22:
      case 23:
        popSuspenseHandler(interruptedWork);
        popHiddenContext();
        null !== current && pop(resumedCache);
        break;
      case 24:
        popProvider(CacheContext);
    }
  }
  function shouldProfile(current) {
    return 0 !== (current.mode & 2) && 0 !== (executionContext & 4);
  }
  function callComponentWillUnmountWithTimer(current, instance) {
    instance.props = resolveClassComponentProps(
      current.type,
      current.memoizedProps
    );
    instance.state = current.memoizedState;
    if (shouldProfile(current))
      try {
        startLayoutEffectTimer(), instance.componentWillUnmount();
      } finally {
        recordLayoutEffectDuration(current);
      }
    else instance.componentWillUnmount();
  }
  function safelyAttachRef(current, nearestMountedAncestor) {
    try {
      var ref = current.ref;
      if (null !== ref) {
        var instance = current.stateNode;
        switch (current.tag) {
          case 26:
          case 27:
          case 5:
            var instanceToUse = getPublicInstance(instance);
            break;
          default:
            instanceToUse = instance;
        }
        if ("function" === typeof ref)
          if (shouldProfile(current))
            try {
              startLayoutEffectTimer(),
                (current.refCleanup = ref(instanceToUse));
            } finally {
              recordLayoutEffectDuration(current);
            }
          else current.refCleanup = ref(instanceToUse);
        else ref.current = instanceToUse;
      }
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }
  function safelyDetachRef(current, nearestMountedAncestor) {
    var ref = current.ref,
      refCleanup = current.refCleanup;
    if (null !== ref)
      if ("function" === typeof refCleanup)
        try {
          if (shouldProfile(current))
            try {
              startLayoutEffectTimer(), refCleanup();
            } finally {
              recordLayoutEffectDuration(current);
            }
          else refCleanup();
        } catch (error) {
          captureCommitPhaseError(current, nearestMountedAncestor, error);
        } finally {
          (current.refCleanup = null),
            (current = current.alternate),
            null != current && (current.refCleanup = null);
        }
      else if ("function" === typeof ref)
        try {
          if (shouldProfile(current))
            try {
              startLayoutEffectTimer(), ref(null);
            } finally {
              recordLayoutEffectDuration(current);
            }
          else ref(null);
        } catch (error$130) {
          captureCommitPhaseError(current, nearestMountedAncestor, error$130);
        }
      else ref.current = null;
  }
  function safelyCallDestroy(current, nearestMountedAncestor, destroy) {
    try {
      destroy();
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }
  function commitBeforeMutationEffects(root, firstChild) {
    prepareForCommit(root.containerInfo);
    for (nextEffect = firstChild; null !== nextEffect; )
      if (
        ((root = nextEffect),
        (firstChild = root.child),
        0 !== (root.subtreeFlags & 1028) && null !== firstChild)
      )
        (firstChild.return = root), (nextEffect = firstChild);
      else
        for (; null !== nextEffect; ) {
          root = nextEffect;
          try {
            var current = root.alternate,
              flags = root.flags;
            switch (root.tag) {
              case 0:
                break;
              case 11:
              case 15:
                break;
              case 1:
                if (0 !== (flags & 1024) && null !== current) {
                  var prevState = current.memoizedState,
                    instance = root.stateNode,
                    snapshot = instance.getSnapshotBeforeUpdate(
                      resolveClassComponentProps(
                        root.type,
                        current.memoizedProps
                      ),
                      prevState
                    );
                  instance.__reactInternalSnapshotBeforeUpdate = snapshot;
                }
                break;
              case 3:
                0 !== (flags & 1024) &&
                  supportsMutation &&
                  clearContainer(root.stateNode.containerInfo);
                break;
              case 5:
              case 26:
              case 27:
              case 6:
              case 4:
              case 17:
                break;
              default:
                if (0 !== (flags & 1024))
                  throw Error(formatProdErrorMessage(163));
            }
          } catch (error) {
            captureCommitPhaseError(root, root.return, error);
          }
          firstChild = root.sibling;
          if (null !== firstChild) {
            firstChild.return = root.return;
            nextEffect = firstChild;
            break;
          }
          nextEffect = root.return;
        }
    current = shouldFireAfterActiveInstanceBlur;
    shouldFireAfterActiveInstanceBlur = !1;
    return current;
  }
  function commitHookEffectListUnmount(
    flags,
    finishedWork,
    nearestMountedAncestor
  ) {
    var updateQueue = finishedWork.updateQueue;
    updateQueue = null !== updateQueue ? updateQueue.lastEffect : null;
    if (null !== updateQueue) {
      var effect = (updateQueue = updateQueue.next);
      do {
        if ((effect.tag & flags) === flags) {
          var inst = effect.inst,
            destroy = inst.destroy;
          void 0 !== destroy &&
            ((inst.destroy = void 0),
            0 !== (flags & 8)
              ? null !== injectedProfilingHooks &&
                "function" ===
                  typeof injectedProfilingHooks.markComponentPassiveEffectUnmountStarted &&
                injectedProfilingHooks.markComponentPassiveEffectUnmountStarted(
                  finishedWork
                )
              : 0 !== (flags & 4) &&
                markComponentLayoutEffectUnmountStarted(finishedWork),
            safelyCallDestroy(finishedWork, nearestMountedAncestor, destroy),
            0 !== (flags & 8)
              ? null !== injectedProfilingHooks &&
                "function" ===
                  typeof injectedProfilingHooks.markComponentPassiveEffectUnmountStopped &&
                injectedProfilingHooks.markComponentPassiveEffectUnmountStopped()
              : 0 !== (flags & 4) && markComponentLayoutEffectUnmountStopped());
        }
        effect = effect.next;
      } while (effect !== updateQueue);
    }
  }
  function commitHookEffectListMount(flags, finishedWork) {
    var updateQueue = finishedWork.updateQueue;
    updateQueue = null !== updateQueue ? updateQueue.lastEffect : null;
    if (null !== updateQueue) {
      var effect = (updateQueue = updateQueue.next);
      do {
        if ((effect.tag & flags) === flags) {
          0 !== (flags & 8)
            ? null !== injectedProfilingHooks &&
              "function" ===
                typeof injectedProfilingHooks.markComponentPassiveEffectMountStarted &&
              injectedProfilingHooks.markComponentPassiveEffectMountStarted(
                finishedWork
              )
            : 0 !== (flags & 4) &&
              null !== injectedProfilingHooks &&
              "function" ===
                typeof injectedProfilingHooks.markComponentLayoutEffectMountStarted &&
              injectedProfilingHooks.markComponentLayoutEffectMountStarted(
                finishedWork
              );
          var create = effect.create,
            inst = effect.inst;
          create = create();
          inst.destroy = create;
          0 !== (flags & 8)
            ? null !== injectedProfilingHooks &&
              "function" ===
                typeof injectedProfilingHooks.markComponentPassiveEffectMountStopped &&
              injectedProfilingHooks.markComponentPassiveEffectMountStopped()
            : 0 !== (flags & 4) &&
              null !== injectedProfilingHooks &&
              "function" ===
                typeof injectedProfilingHooks.markComponentLayoutEffectMountStopped &&
              injectedProfilingHooks.markComponentLayoutEffectMountStopped();
        }
        effect = effect.next;
      } while (effect !== updateQueue);
    }
  }
  function commitHookLayoutEffects(finishedWork, hookFlags) {
    if (shouldProfile(finishedWork)) {
      try {
        startLayoutEffectTimer(),
          commitHookEffectListMount(hookFlags, finishedWork);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
      recordLayoutEffectDuration(finishedWork);
    } else
      try {
        commitHookEffectListMount(hookFlags, finishedWork);
      } catch (error$132) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error$132);
      }
  }
  function commitClassCallbacks(finishedWork) {
    var updateQueue = finishedWork.updateQueue;
    if (null !== updateQueue) {
      var instance = finishedWork.stateNode;
      try {
        commitCallbacks(updateQueue, instance);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
  }
  function commitHostComponentMount(finishedWork) {
    var type = finishedWork.type,
      props = finishedWork.memoizedProps,
      instance = finishedWork.stateNode;
    try {
      commitMount(instance, type, props, finishedWork);
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function commitProfilerUpdate(finishedWork, current) {
    if (executionContext & 4)
      try {
        var _finishedWork$memoize2 = finishedWork.memoizedProps,
          onCommit = _finishedWork$memoize2.onCommit,
          onRender = _finishedWork$memoize2.onRender,
          effectDuration = finishedWork.stateNode.effectDuration;
        _finishedWork$memoize2 = commitTime;
        current = null === current ? "mount" : "update";
        currentUpdateIsNested && (current = "nested-update");
        "function" === typeof onRender &&
          onRender(
            finishedWork.memoizedProps.id,
            current,
            finishedWork.actualDuration,
            finishedWork.treeBaseDuration,
            finishedWork.actualStartTime,
            _finishedWork$memoize2
          );
        "function" === typeof onCommit &&
          onCommit(
            finishedWork.memoizedProps.id,
            current,
            effectDuration,
            _finishedWork$memoize2
          );
        enqueuePendingPassiveProfilerEffect(finishedWork);
        var parentFiber = finishedWork.return;
        a: for (; null !== parentFiber; ) {
          switch (parentFiber.tag) {
            case 3:
              parentFiber.stateNode.effectDuration += effectDuration;
              break a;
            case 12:
              parentFiber.stateNode.effectDuration += effectDuration;
              break a;
          }
          parentFiber = parentFiber.return;
        }
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
  }
  function commitLayoutEffectOnFiber(finishedRoot, current, finishedWork) {
    var flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 && commitHookLayoutEffects(finishedWork, 5);
        break;
      case 1:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        if (flags & 4)
          if (((finishedRoot = finishedWork.stateNode), null === current))
            if (shouldProfile(finishedWork)) {
              try {
                startLayoutEffectTimer(), finishedRoot.componentDidMount();
              } catch (error) {
                captureCommitPhaseError(
                  finishedWork,
                  finishedWork.return,
                  error
                );
              }
              recordLayoutEffectDuration(finishedWork);
            } else
              try {
                finishedRoot.componentDidMount();
              } catch (error$133) {
                captureCommitPhaseError(
                  finishedWork,
                  finishedWork.return,
                  error$133
                );
              }
          else {
            var prevProps = resolveClassComponentProps(
              finishedWork.type,
              current.memoizedProps
            );
            current = current.memoizedState;
            if (shouldProfile(finishedWork)) {
              try {
                startLayoutEffectTimer(),
                  finishedRoot.componentDidUpdate(
                    prevProps,
                    current,
                    finishedRoot.__reactInternalSnapshotBeforeUpdate
                  );
              } catch (error$134) {
                captureCommitPhaseError(
                  finishedWork,
                  finishedWork.return,
                  error$134
                );
              }
              recordLayoutEffectDuration(finishedWork);
            } else
              try {
                finishedRoot.componentDidUpdate(
                  prevProps,
                  current,
                  finishedRoot.__reactInternalSnapshotBeforeUpdate
                );
              } catch (error$135) {
                captureCommitPhaseError(
                  finishedWork,
                  finishedWork.return,
                  error$135
                );
              }
          }
        flags & 64 && commitClassCallbacks(finishedWork);
        flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 3:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        if (
          flags & 64 &&
          ((flags = finishedWork.updateQueue), null !== flags)
        ) {
          finishedRoot = null;
          if (null !== finishedWork.child)
            switch (finishedWork.child.tag) {
              case 27:
              case 5:
                finishedRoot = getPublicInstance(finishedWork.child.stateNode);
                break;
              case 1:
                finishedRoot = finishedWork.child.stateNode;
            }
          try {
            commitCallbacks(flags, finishedRoot);
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        break;
      case 26:
        if (supportsResources) {
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
          break;
        }
      case 27:
      case 5:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        null === current && flags & 4 && commitHostComponentMount(finishedWork);
        flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 12:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 && commitProfilerUpdate(finishedWork, current);
        break;
      case 13:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 &&
          commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
        break;
      case 22:
        prevProps =
          null !== finishedWork.memoizedState || offscreenSubtreeIsHidden;
        if (!prevProps) {
          current =
            (null !== current && null !== current.memoizedState) ||
            offscreenSubtreeWasHidden;
          var prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden,
            prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
          offscreenSubtreeIsHidden = prevProps;
          (offscreenSubtreeWasHidden = current) &&
          !prevOffscreenSubtreeWasHidden
            ? recursivelyTraverseReappearLayoutEffects(
                finishedRoot,
                finishedWork,
                0 !== (finishedWork.subtreeFlags & 8772)
              )
            : recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
          offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        }
        flags & 512 &&
          ("manual" === finishedWork.memoizedProps.mode
            ? safelyAttachRef(finishedWork, finishedWork.return)
            : safelyDetachRef(finishedWork, finishedWork.return));
        break;
      default:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
    }
  }
  function detachFiberAfterEffects(fiber) {
    var alternate = fiber.alternate;
    null !== alternate &&
      ((fiber.alternate = null), detachFiberAfterEffects(alternate));
    fiber.child = null;
    fiber.deletions = null;
    fiber.sibling = null;
    5 === fiber.tag &&
      ((alternate = fiber.stateNode),
      null !== alternate && detachDeletedInstance(alternate));
    fiber.stateNode = null;
    fiber.return = null;
    fiber.dependencies = null;
    fiber.memoizedProps = null;
    fiber.memoizedState = null;
    fiber.pendingProps = null;
    fiber.stateNode = null;
    fiber.updateQueue = null;
  }
  function isHostParent(fiber) {
    return (
      5 === fiber.tag ||
      3 === fiber.tag ||
      (supportsResources ? 26 === fiber.tag : !1) ||
      (supportsSingletons ? 27 === fiber.tag : !1) ||
      4 === fiber.tag
    );
  }
  function getHostSibling(fiber) {
    a: for (;;) {
      for (; null === fiber.sibling; ) {
        if (null === fiber.return || isHostParent(fiber.return)) return null;
        fiber = fiber.return;
      }
      fiber.sibling.return = fiber.return;
      for (
        fiber = fiber.sibling;
        5 !== fiber.tag &&
        6 !== fiber.tag &&
        (supportsSingletons ? 27 !== fiber.tag : 1) &&
        18 !== fiber.tag;

      ) {
        if (fiber.flags & 2) continue a;
        if (null === fiber.child || 4 === fiber.tag) continue a;
        else (fiber.child.return = fiber), (fiber = fiber.child);
      }
      if (!(fiber.flags & 2)) return fiber.stateNode;
    }
  }
  function insertOrAppendPlacementNodeIntoContainer(node, before, parent) {
    var tag = node.tag;
    if (5 === tag || 6 === tag)
      (node = node.stateNode),
        before
          ? insertInContainerBefore(parent, node, before)
          : appendChildToContainer(parent, node);
    else if (
      !(4 === tag || (supportsSingletons && 27 === tag)) &&
      ((node = node.child), null !== node)
    )
      for (
        insertOrAppendPlacementNodeIntoContainer(node, before, parent),
          node = node.sibling;
        null !== node;

      )
        insertOrAppendPlacementNodeIntoContainer(node, before, parent),
          (node = node.sibling);
  }
  function insertOrAppendPlacementNode(node, before, parent) {
    var tag = node.tag;
    if (5 === tag || 6 === tag)
      (node = node.stateNode),
        before ? insertBefore(parent, node, before) : appendChild(parent, node);
    else if (
      !(4 === tag || (supportsSingletons && 27 === tag)) &&
      ((node = node.child), null !== node)
    )
      for (
        insertOrAppendPlacementNode(node, before, parent), node = node.sibling;
        null !== node;

      )
        insertOrAppendPlacementNode(node, before, parent),
          (node = node.sibling);
  }
  function recursivelyTraverseDeletionEffects(
    finishedRoot,
    nearestMountedAncestor,
    parent
  ) {
    for (parent = parent.child; null !== parent; )
      commitDeletionEffectsOnFiber(
        finishedRoot,
        nearestMountedAncestor,
        parent
      ),
        (parent = parent.sibling);
  }
  function commitDeletionEffectsOnFiber(
    finishedRoot,
    nearestMountedAncestor,
    deletedFiber
  ) {
    if (injectedHook && "function" === typeof injectedHook.onCommitFiberUnmount)
      try {
        injectedHook.onCommitFiberUnmount(rendererID, deletedFiber);
      } catch (err) {}
    switch (deletedFiber.tag) {
      case 26:
        if (supportsResources) {
          offscreenSubtreeWasHidden ||
            safelyDetachRef(deletedFiber, nearestMountedAncestor);
          recursivelyTraverseDeletionEffects(
            finishedRoot,
            nearestMountedAncestor,
            deletedFiber
          );
          deletedFiber.memoizedState
            ? releaseResource(deletedFiber.memoizedState)
            : deletedFiber.stateNode &&
              unmountHoistable(deletedFiber.stateNode);
          break;
        }
      case 27:
        if (supportsSingletons) {
          offscreenSubtreeWasHidden ||
            safelyDetachRef(deletedFiber, nearestMountedAncestor);
          var prevHostParent = hostParent,
            prevHostParentIsContainer = hostParentIsContainer;
          hostParent = deletedFiber.stateNode;
          recursivelyTraverseDeletionEffects(
            finishedRoot,
            nearestMountedAncestor,
            deletedFiber
          );
          releaseSingletonInstance(deletedFiber.stateNode);
          hostParent = prevHostParent;
          hostParentIsContainer = prevHostParentIsContainer;
          break;
        }
      case 5:
        offscreenSubtreeWasHidden ||
          safelyDetachRef(deletedFiber, nearestMountedAncestor);
      case 6:
        supportsMutation
          ? ((prevHostParent = hostParent),
            (prevHostParentIsContainer = hostParentIsContainer),
            (hostParent = null),
            recursivelyTraverseDeletionEffects(
              finishedRoot,
              nearestMountedAncestor,
              deletedFiber
            ),
            (hostParent = prevHostParent),
            (hostParentIsContainer = prevHostParentIsContainer),
            null !== hostParent &&
              (hostParentIsContainer
                ? removeChildFromContainer(hostParent, deletedFiber.stateNode)
                : removeChild(hostParent, deletedFiber.stateNode)))
          : recursivelyTraverseDeletionEffects(
              finishedRoot,
              nearestMountedAncestor,
              deletedFiber
            );
        break;
      case 18:
        supportsMutation &&
          null !== hostParent &&
          (hostParentIsContainer
            ? clearSuspenseBoundaryFromContainer(
                hostParent,
                deletedFiber.stateNode
              )
            : clearSuspenseBoundary(hostParent, deletedFiber.stateNode));
        break;
      case 4:
        supportsMutation
          ? ((prevHostParent = hostParent),
            (prevHostParentIsContainer = hostParentIsContainer),
            (hostParent = deletedFiber.stateNode.containerInfo),
            (hostParentIsContainer = !0),
            recursivelyTraverseDeletionEffects(
              finishedRoot,
              nearestMountedAncestor,
              deletedFiber
            ),
            (hostParent = prevHostParent),
            (hostParentIsContainer = prevHostParentIsContainer))
          : (supportsPersistence &&
              ((prevHostParent = deletedFiber.stateNode.containerInfo),
              (prevHostParentIsContainer = createContainerChildSet()),
              replaceContainerChildren(
                prevHostParent,
                prevHostParentIsContainer
              )),
            recursivelyTraverseDeletionEffects(
              finishedRoot,
              nearestMountedAncestor,
              deletedFiber
            ));
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (
          !offscreenSubtreeWasHidden &&
          ((prevHostParent = deletedFiber.updateQueue),
          null !== prevHostParent &&
            ((prevHostParent = prevHostParent.lastEffect),
            null !== prevHostParent))
        ) {
          prevHostParentIsContainer = prevHostParent = prevHostParent.next;
          do {
            var tag = prevHostParentIsContainer.tag,
              inst = prevHostParentIsContainer.inst,
              destroy = inst.destroy;
            void 0 !== destroy &&
              (0 !== (tag & 2)
                ? ((inst.destroy = void 0),
                  safelyCallDestroy(
                    deletedFiber,
                    nearestMountedAncestor,
                    destroy
                  ))
                : 0 !== (tag & 4) &&
                  (markComponentLayoutEffectUnmountStarted(deletedFiber),
                  shouldProfile(deletedFiber)
                    ? (startLayoutEffectTimer(),
                      (inst.destroy = void 0),
                      safelyCallDestroy(
                        deletedFiber,
                        nearestMountedAncestor,
                        destroy
                      ),
                      recordLayoutEffectDuration(deletedFiber))
                    : ((inst.destroy = void 0),
                      safelyCallDestroy(
                        deletedFiber,
                        nearestMountedAncestor,
                        destroy
                      )),
                  markComponentLayoutEffectUnmountStopped()));
            prevHostParentIsContainer = prevHostParentIsContainer.next;
          } while (prevHostParentIsContainer !== prevHostParent);
        }
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 1:
        if (
          !offscreenSubtreeWasHidden &&
          (safelyDetachRef(deletedFiber, nearestMountedAncestor),
          (prevHostParent = deletedFiber.stateNode),
          "function" === typeof prevHostParent.componentWillUnmount)
        )
          try {
            callComponentWillUnmountWithTimer(deletedFiber, prevHostParent);
          } catch (error) {
            captureCommitPhaseError(
              deletedFiber,
              nearestMountedAncestor,
              error
            );
          }
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 21:
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 22:
        safelyDetachRef(deletedFiber, nearestMountedAncestor);
        offscreenSubtreeWasHidden =
          (prevHostParent = offscreenSubtreeWasHidden) ||
          null !== deletedFiber.memoizedState;
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        offscreenSubtreeWasHidden = prevHostParent;
        break;
      default:
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
    }
  }
  function commitSuspenseHydrationCallbacks(finishedRoot, finishedWork) {
    if (
      supportsHydration &&
      null === finishedWork.memoizedState &&
      ((finishedRoot = finishedWork.alternate),
      null !== finishedRoot &&
        ((finishedRoot = finishedRoot.memoizedState),
        null !== finishedRoot &&
          ((finishedRoot = finishedRoot.dehydrated), null !== finishedRoot)))
    )
      try {
        commitHydratedSuspenseInstance(finishedRoot);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
  }
  function getRetryCache(finishedWork) {
    switch (finishedWork.tag) {
      case 13:
      case 19:
        var retryCache = finishedWork.stateNode;
        null === retryCache &&
          (retryCache = finishedWork.stateNode = new PossiblyWeakSet());
        return retryCache;
      case 22:
        return (
          (finishedWork = finishedWork.stateNode),
          (retryCache = finishedWork._retryCache),
          null === retryCache &&
            (retryCache = finishedWork._retryCache = new PossiblyWeakSet()),
          retryCache
        );
      default:
        throw Error(formatProdErrorMessage(435, finishedWork.tag));
    }
  }
  function attachSuspenseRetryListeners(finishedWork, wakeables) {
    var retryCache = getRetryCache(finishedWork);
    wakeables.forEach(function (wakeable) {
      var retry = resolveRetryWakeable.bind(null, finishedWork, wakeable);
      if (!retryCache.has(wakeable)) {
        retryCache.add(wakeable);
        if (isDevToolsPresent)
          if (null !== inProgressLanes && null !== inProgressRoot)
            restorePendingUpdaters(inProgressRoot, inProgressLanes);
          else throw Error(formatProdErrorMessage(413));
        wakeable.then(retry, retry);
      }
    });
  }
  function commitMutationEffects(root, finishedWork, committedLanes) {
    inProgressLanes = committedLanes;
    inProgressRoot = root;
    commitMutationEffectsOnFiber(finishedWork, root);
    inProgressRoot = inProgressLanes = null;
  }
  function recursivelyTraverseMutationEffects(root$jscomp$0, parentFiber) {
    var deletions = parentFiber.deletions;
    if (null !== deletions)
      for (var i = 0; i < deletions.length; i++) {
        var childToDelete = deletions[i];
        try {
          var root = root$jscomp$0,
            returnFiber = parentFiber;
          if (supportsMutation) {
            var parent = returnFiber;
            a: for (; null !== parent; ) {
              switch (parent.tag) {
                case 27:
                case 5:
                  hostParent = parent.stateNode;
                  hostParentIsContainer = !1;
                  break a;
                case 3:
                  hostParent = parent.stateNode.containerInfo;
                  hostParentIsContainer = !0;
                  break a;
                case 4:
                  hostParent = parent.stateNode.containerInfo;
                  hostParentIsContainer = !0;
                  break a;
              }
              parent = parent.return;
            }
            if (null === hostParent) throw Error(formatProdErrorMessage(160));
            commitDeletionEffectsOnFiber(root, returnFiber, childToDelete);
            hostParent = null;
            hostParentIsContainer = !1;
          } else commitDeletionEffectsOnFiber(root, returnFiber, childToDelete);
          var alternate = childToDelete.alternate;
          null !== alternate && (alternate.return = null);
          childToDelete.return = null;
        } catch (error) {
          captureCommitPhaseError(childToDelete, parentFiber, error);
        }
      }
    if (parentFiber.subtreeFlags & 13878)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitMutationEffectsOnFiber(parentFiber, root$jscomp$0),
          (parentFiber = parentFiber.sibling);
  }
  function commitMutationEffectsOnFiber(finishedWork, root) {
    var current = finishedWork.alternate,
      flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        if (flags & 4) {
          try {
            commitHookEffectListUnmount(3, finishedWork, finishedWork.return),
              commitHookEffectListMount(3, finishedWork);
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
          if (shouldProfile(finishedWork)) {
            try {
              startLayoutEffectTimer(),
                commitHookEffectListUnmount(
                  5,
                  finishedWork,
                  finishedWork.return
                );
            } catch (error$148) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$148
              );
            }
            recordLayoutEffectDuration(finishedWork);
          } else
            try {
              commitHookEffectListUnmount(5, finishedWork, finishedWork.return);
            } catch (error$149) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$149
              );
            }
        }
        break;
      case 1:
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 512 &&
          null !== current &&
          safelyDetachRef(current, current.return);
        flags & 64 &&
          offscreenSubtreeIsHidden &&
          ((finishedWork = finishedWork.updateQueue),
          null !== finishedWork &&
            ((flags = finishedWork.callbacks),
            null !== flags &&
              ((current = finishedWork.shared.hiddenCallbacks),
              (finishedWork.shared.hiddenCallbacks =
                null === current ? flags : current.concat(flags)))));
        break;
      case 26:
        if (supportsResources) {
          var hoistableRoot = currentHoistableRoot;
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          flags & 512 &&
            null !== current &&
            safelyDetachRef(current, current.return);
          if (flags & 4)
            if (
              ((flags = null !== current ? current.memoizedState : null),
              (root = finishedWork.memoizedState),
              null === current)
            )
              null === root
                ? null === finishedWork.stateNode
                  ? (finishedWork.stateNode = hydrateHoistable(
                      hoistableRoot,
                      finishedWork.type,
                      finishedWork.memoizedProps,
                      finishedWork
                    ))
                  : mountHoistable(
                      hoistableRoot,
                      finishedWork.type,
                      finishedWork.stateNode
                    )
                : (finishedWork.stateNode = acquireResource(
                    hoistableRoot,
                    root,
                    finishedWork.memoizedProps
                  ));
            else if (flags !== root)
              null === flags
                ? null !== current.stateNode &&
                  unmountHoistable(current.stateNode)
                : releaseResource(flags),
                null === root
                  ? mountHoistable(
                      hoistableRoot,
                      finishedWork.type,
                      finishedWork.stateNode
                    )
                  : acquireResource(
                      hoistableRoot,
                      root,
                      finishedWork.memoizedProps
                    );
            else if (null === root && null !== finishedWork.stateNode)
              try {
                commitUpdate(
                  finishedWork.stateNode,
                  finishedWork.type,
                  current.memoizedProps,
                  finishedWork.memoizedProps,
                  finishedWork
                );
              } catch (error$150) {
                captureCommitPhaseError(
                  finishedWork,
                  finishedWork.return,
                  error$150
                );
              }
          break;
        }
      case 27:
        if (
          supportsSingletons &&
          flags & 4 &&
          null === finishedWork.alternate
        ) {
          hoistableRoot = finishedWork.stateNode;
          var props = finishedWork.memoizedProps;
          clearSingleton(hoistableRoot);
          acquireSingletonInstance(
            finishedWork.type,
            props,
            hoistableRoot,
            finishedWork
          );
        }
      case 5:
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 512 &&
          null !== current &&
          safelyDetachRef(current, current.return);
        if (supportsMutation) {
          if (finishedWork.flags & 32) {
            root = finishedWork.stateNode;
            try {
              resetTextContent(root);
            } catch (error$151) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$151
              );
            }
          }
          if (flags & 4 && ((root = finishedWork.stateNode), null != root)) {
            hoistableRoot = finishedWork.memoizedProps;
            current = null !== current ? current.memoizedProps : hoistableRoot;
            props = finishedWork.type;
            try {
              commitUpdate(root, props, current, hoistableRoot, finishedWork);
            } catch (error$153) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$153
              );
            }
          }
          flags & 1024 && (needsFormReset = !0);
        }
        break;
      case 6:
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        if (flags & 4 && supportsMutation) {
          if (null === finishedWork.stateNode)
            throw Error(formatProdErrorMessage(162));
          flags = finishedWork.stateNode;
          root = finishedWork.memoizedProps;
          current = null !== current ? current.memoizedProps : root;
          try {
            commitTextUpdate(flags, current, root);
          } catch (error$154) {
            captureCommitPhaseError(
              finishedWork,
              finishedWork.return,
              error$154
            );
          }
        }
        break;
      case 3:
        supportsResources
          ? (prepareToCommitHoistables(),
            (hoistableRoot = currentHoistableRoot),
            (currentHoistableRoot = getHoistableRoot(root.containerInfo)),
            recursivelyTraverseMutationEffects(root, finishedWork),
            (currentHoistableRoot = hoistableRoot))
          : recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        if (flags & 4) {
          if (
            supportsMutation &&
            supportsHydration &&
            null !== current &&
            current.memoizedState.isDehydrated
          )
            try {
              commitHydratedContainer(root.containerInfo);
            } catch (error$155) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$155
              );
            }
          if (supportsPersistence) {
            flags = root.containerInfo;
            current = root.pendingChildren;
            try {
              replaceContainerChildren(flags, current);
            } catch (error$156) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$156
              );
            }
          }
        }
        needsFormReset &&
          ((needsFormReset = !1), recursivelyResetForms(finishedWork));
        break;
      case 4:
        supportsResources
          ? ((current = currentHoistableRoot),
            (currentHoistableRoot = getHoistableRoot(
              finishedWork.stateNode.containerInfo
            )),
            recursivelyTraverseMutationEffects(root, finishedWork),
            commitReconciliationEffects(finishedWork),
            (currentHoistableRoot = current))
          : (recursivelyTraverseMutationEffects(root, finishedWork),
            commitReconciliationEffects(finishedWork));
        if (flags & 4 && supportsPersistence) {
          current = finishedWork.stateNode;
          flags = current.containerInfo;
          current = current.pendingChildren;
          try {
            replaceContainerChildren(flags, current);
          } catch (error$160) {
            captureCommitPhaseError(
              finishedWork,
              finishedWork.return,
              error$160
            );
          }
        }
        break;
      case 13:
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        finishedWork.child.flags & 8192 &&
          (null !== finishedWork.memoizedState) !==
            (null !== current && null !== current.memoizedState) &&
          (globalMostRecentFallbackTime = now$1());
        flags & 4 &&
          ((flags = finishedWork.updateQueue),
          null !== flags &&
            ((finishedWork.updateQueue = null),
            attachSuspenseRetryListeners(finishedWork, flags)));
        break;
      case 22:
        flags & 512 &&
          null !== current &&
          safelyDetachRef(current, current.return);
        hoistableRoot = null !== finishedWork.memoizedState;
        var wasHidden = null !== current && null !== current.memoizedState,
          prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden,
          prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
        offscreenSubtreeIsHidden =
          prevOffscreenSubtreeIsHidden || hoistableRoot;
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden || wasHidden;
        recursivelyTraverseMutationEffects(root, finishedWork);
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
        commitReconciliationEffects(finishedWork);
        root = finishedWork.stateNode;
        root._current = finishedWork;
        root._visibility &= -3;
        root._visibility |= root._pendingVisibility & 2;
        if (
          flags & 8192 &&
          ((root._visibility = hoistableRoot
            ? root._visibility & -2
            : root._visibility | 1),
          hoistableRoot &&
            ((root = offscreenSubtreeIsHidden || offscreenSubtreeWasHidden),
            null === current ||
              wasHidden ||
              root ||
              recursivelyTraverseDisappearLayoutEffects(finishedWork)),
          supportsMutation &&
            (null === finishedWork.memoizedProps ||
              "manual" !== finishedWork.memoizedProps.mode))
        )
          a: if (((current = null), supportsMutation))
            for (root = finishedWork; ; ) {
              if (
                5 === root.tag ||
                (supportsResources && 26 === root.tag) ||
                (supportsSingletons && 27 === root.tag)
              ) {
                if (null === current) {
                  current = root;
                  try {
                    (props = root.stateNode),
                      hoistableRoot
                        ? hideInstance(props)
                        : unhideInstance(root.stateNode, root.memoizedProps);
                  } catch (error) {
                    captureCommitPhaseError(
                      finishedWork,
                      finishedWork.return,
                      error
                    );
                  }
                }
              } else if (6 === root.tag) {
                if (null === current)
                  try {
                    var instance$137 = root.stateNode;
                    hoistableRoot
                      ? hideTextInstance(instance$137)
                      : unhideTextInstance(instance$137, root.memoizedProps);
                  } catch (error$138) {
                    captureCommitPhaseError(
                      finishedWork,
                      finishedWork.return,
                      error$138
                    );
                  }
              } else if (
                ((22 !== root.tag && 23 !== root.tag) ||
                  null === root.memoizedState ||
                  root === finishedWork) &&
                null !== root.child
              ) {
                root.child.return = root;
                root = root.child;
                continue;
              }
              if (root === finishedWork) break a;
              for (; null === root.sibling; ) {
                if (null === root.return || root.return === finishedWork)
                  break a;
                current === root && (current = null);
                root = root.return;
              }
              current === root && (current = null);
              root.sibling.return = root.return;
              root = root.sibling;
            }
        flags & 4 &&
          ((flags = finishedWork.updateQueue),
          null !== flags &&
            ((current = flags.retryQueue),
            null !== current &&
              ((flags.retryQueue = null),
              attachSuspenseRetryListeners(finishedWork, current))));
        break;
      case 19:
        recursivelyTraverseMutationEffects(root, finishedWork);
        commitReconciliationEffects(finishedWork);
        flags & 4 &&
          ((flags = finishedWork.updateQueue),
          null !== flags &&
            ((finishedWork.updateQueue = null),
            attachSuspenseRetryListeners(finishedWork, flags)));
        break;
      case 21:
        break;
      default:
        recursivelyTraverseMutationEffects(root, finishedWork),
          commitReconciliationEffects(finishedWork);
    }
  }
  function commitReconciliationEffects(finishedWork) {
    var flags = finishedWork.flags;
    if (flags & 2) {
      try {
        if (
          supportsMutation &&
          (!supportsSingletons || 27 !== finishedWork.tag)
        ) {
          b: {
            for (var parent = finishedWork.return; null !== parent; ) {
              if (isHostParent(parent)) {
                var JSCompiler_inline_result = parent;
                break b;
              }
              parent = parent.return;
            }
            throw Error(formatProdErrorMessage(160));
          }
          switch (JSCompiler_inline_result.tag) {
            case 27:
              if (supportsSingletons) {
                var parent$jscomp$0 = JSCompiler_inline_result.stateNode,
                  before = getHostSibling(finishedWork);
                insertOrAppendPlacementNode(
                  finishedWork,
                  before,
                  parent$jscomp$0
                );
                break;
              }
            case 5:
              var parent$139 = JSCompiler_inline_result.stateNode;
              JSCompiler_inline_result.flags & 32 &&
                (resetTextContent(parent$139),
                (JSCompiler_inline_result.flags &= -33));
              var before$140 = getHostSibling(finishedWork);
              insertOrAppendPlacementNode(finishedWork, before$140, parent$139);
              break;
            case 3:
            case 4:
              var parent$141 = JSCompiler_inline_result.stateNode.containerInfo,
                before$142 = getHostSibling(finishedWork);
              insertOrAppendPlacementNodeIntoContainer(
                finishedWork,
                before$142,
                parent$141
              );
              break;
            default:
              throw Error(formatProdErrorMessage(161));
          }
        }
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
      finishedWork.flags &= -3;
    }
    flags & 4096 && (finishedWork.flags &= -4097);
  }
  function recursivelyResetForms(parentFiber) {
    if (parentFiber.subtreeFlags & 1024)
      for (parentFiber = parentFiber.child; null !== parentFiber; ) {
        var fiber = parentFiber;
        recursivelyResetForms(fiber);
        5 === fiber.tag &&
          fiber.flags & 1024 &&
          resetFormInstance(fiber.stateNode);
        parentFiber = parentFiber.sibling;
      }
  }
  function commitLayoutEffects(finishedWork, root, committedLanes) {
    inProgressLanes = committedLanes;
    inProgressRoot = root;
    commitLayoutEffectOnFiber(root, finishedWork.alternate, finishedWork);
    inProgressRoot = inProgressLanes = null;
  }
  function recursivelyTraverseLayoutEffects(root, parentFiber) {
    if (parentFiber.subtreeFlags & 8772)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitLayoutEffectOnFiber(root, parentFiber.alternate, parentFiber),
          (parentFiber = parentFiber.sibling);
  }
  function recursivelyTraverseDisappearLayoutEffects(parentFiber) {
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var finishedWork = parentFiber;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          if (shouldProfile(finishedWork))
            try {
              startLayoutEffectTimer(),
                commitHookEffectListUnmount(
                  4,
                  finishedWork,
                  finishedWork.return
                );
            } finally {
              recordLayoutEffectDuration(finishedWork);
            }
          else
            commitHookEffectListUnmount(4, finishedWork, finishedWork.return);
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 1:
          safelyDetachRef(finishedWork, finishedWork.return);
          var instance = finishedWork.stateNode;
          if ("function" === typeof instance.componentWillUnmount) {
            var current = finishedWork,
              nearestMountedAncestor = finishedWork.return;
            try {
              callComponentWillUnmountWithTimer(current, instance);
            } catch (error) {
              captureCommitPhaseError(current, nearestMountedAncestor, error);
            }
          }
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 26:
        case 27:
        case 5:
          safelyDetachRef(finishedWork, finishedWork.return);
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 22:
          safelyDetachRef(finishedWork, finishedWork.return);
          null === finishedWork.memoizedState &&
            recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        default:
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function recursivelyTraverseReappearLayoutEffects(
    finishedRoot$jscomp$0,
    parentFiber,
    includeWorkInProgressEffects
  ) {
    includeWorkInProgressEffects =
      includeWorkInProgressEffects && 0 !== (parentFiber.subtreeFlags & 8772);
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var current = parentFiber.alternate,
        finishedRoot = finishedRoot$jscomp$0,
        finishedWork = parentFiber,
        flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          commitHookLayoutEffects(finishedWork, 4);
          break;
        case 1:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          finishedRoot = finishedWork.stateNode;
          if ("function" === typeof finishedRoot.componentDidMount)
            try {
              finishedRoot.componentDidMount();
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          current = finishedWork.updateQueue;
          if (null !== current) {
            var hiddenCallbacks = current.shared.hiddenCallbacks;
            if (null !== hiddenCallbacks)
              for (
                current.shared.hiddenCallbacks = null, current = 0;
                current < hiddenCallbacks.length;
                current++
              )
                callCallback(hiddenCallbacks[current], finishedRoot);
          }
          includeWorkInProgressEffects &&
            flags & 64 &&
            commitClassCallbacks(finishedWork);
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 26:
        case 27:
        case 5:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects &&
            null === current &&
            flags & 4 &&
            commitHostComponentMount(finishedWork);
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 12:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects &&
            flags & 4 &&
            commitProfilerUpdate(finishedWork, current);
          break;
        case 13:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects &&
            flags & 4 &&
            commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
          break;
        case 22:
          null === finishedWork.memoizedState &&
            recursivelyTraverseReappearLayoutEffects(
              finishedRoot,
              finishedWork,
              includeWorkInProgressEffects
            );
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        default:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            includeWorkInProgressEffects
          );
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function commitHookPassiveMountEffects(finishedWork, hookFlags) {
    if (shouldProfile(finishedWork)) {
      passiveEffectStartTime = now();
      try {
        commitHookEffectListMount(hookFlags, finishedWork);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
      recordPassiveEffectDuration(finishedWork);
    } else
      try {
        commitHookEffectListMount(hookFlags, finishedWork);
      } catch (error$164) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error$164);
      }
  }
  function commitOffscreenPassiveMountEffects(current, finishedWork) {
    var previousCache = null;
    null !== current &&
      null !== current.memoizedState &&
      null !== current.memoizedState.cachePool &&
      (previousCache = current.memoizedState.cachePool.pool);
    current = null;
    null !== finishedWork.memoizedState &&
      null !== finishedWork.memoizedState.cachePool &&
      (current = finishedWork.memoizedState.cachePool.pool);
    current !== previousCache &&
      (null != current && current.refCount++,
      null != previousCache && releaseCache(previousCache));
  }
  function commitCachePassiveMountEffect(current, finishedWork) {
    current = null;
    null !== finishedWork.alternate &&
      (current = finishedWork.alternate.memoizedState.cache);
    finishedWork = finishedWork.memoizedState.cache;
    finishedWork !== current &&
      (finishedWork.refCount++, null != current && releaseCache(current));
  }
  function recursivelyTraversePassiveMountEffects(
    root,
    parentFiber,
    committedLanes,
    committedTransitions
  ) {
    if (parentFiber.subtreeFlags & 10256)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitPassiveMountOnFiber(
          root,
          parentFiber,
          committedLanes,
          committedTransitions
        ),
          (parentFiber = parentFiber.sibling);
  }
  function commitPassiveMountOnFiber(
    finishedRoot,
    finishedWork,
    committedLanes,
    committedTransitions
  ) {
    var flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        flags & 2048 && commitHookPassiveMountEffects(finishedWork, 9);
        break;
      case 3:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        flags & 2048 &&
          ((finishedRoot = null),
          null !== finishedWork.alternate &&
            (finishedRoot = finishedWork.alternate.memoizedState.cache),
          (finishedWork = finishedWork.memoizedState.cache),
          finishedWork !== finishedRoot &&
            (finishedWork.refCount++,
            null != finishedRoot && releaseCache(finishedRoot)));
        break;
      case 23:
        break;
      case 22:
        var instance = finishedWork.stateNode;
        null !== finishedWork.memoizedState
          ? instance._visibility & 4
            ? recursivelyTraversePassiveMountEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions
              )
            : recursivelyTraverseAtomicPassiveEffects(
                finishedRoot,
                finishedWork
              )
          : instance._visibility & 4
          ? recursivelyTraversePassiveMountEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions
            )
          : ((instance._visibility |= 4),
            recursivelyTraverseReconnectPassiveEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions,
              0 !== (finishedWork.subtreeFlags & 10256)
            ));
        flags & 2048 &&
          commitOffscreenPassiveMountEffects(
            finishedWork.alternate,
            finishedWork
          );
        break;
      case 24:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        flags & 2048 &&
          commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
        break;
      default:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
    }
  }
  function recursivelyTraverseReconnectPassiveEffects(
    finishedRoot$jscomp$0,
    parentFiber,
    committedLanes$jscomp$0,
    committedTransitions$jscomp$0,
    includeWorkInProgressEffects
  ) {
    includeWorkInProgressEffects =
      includeWorkInProgressEffects && 0 !== (parentFiber.subtreeFlags & 10256);
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var finishedRoot = finishedRoot$jscomp$0,
        finishedWork = parentFiber,
        committedLanes = committedLanes$jscomp$0,
        committedTransitions = committedTransitions$jscomp$0,
        flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          );
          commitHookPassiveMountEffects(finishedWork, 8);
          break;
        case 23:
          break;
        case 22:
          var instance = finishedWork.stateNode;
          null !== finishedWork.memoizedState
            ? instance._visibility & 4
              ? recursivelyTraverseReconnectPassiveEffects(
                  finishedRoot,
                  finishedWork,
                  committedLanes,
                  committedTransitions,
                  includeWorkInProgressEffects
                )
              : recursivelyTraverseAtomicPassiveEffects(
                  finishedRoot,
                  finishedWork
                )
            : ((instance._visibility |= 4),
              recursivelyTraverseReconnectPassiveEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions,
                includeWorkInProgressEffects
              ));
          includeWorkInProgressEffects &&
            flags & 2048 &&
            commitOffscreenPassiveMountEffects(
              finishedWork.alternate,
              finishedWork
            );
          break;
        case 24:
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects &&
            flags & 2048 &&
            commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
          break;
        default:
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          );
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function recursivelyTraverseAtomicPassiveEffects(
    finishedRoot$jscomp$0,
    parentFiber
  ) {
    if (parentFiber.subtreeFlags & 10256)
      for (parentFiber = parentFiber.child; null !== parentFiber; ) {
        var finishedRoot = finishedRoot$jscomp$0,
          finishedWork = parentFiber,
          flags = finishedWork.flags;
        switch (finishedWork.tag) {
          case 22:
            recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
            flags & 2048 &&
              commitOffscreenPassiveMountEffects(
                finishedWork.alternate,
                finishedWork
              );
            break;
          case 24:
            recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
            flags & 2048 &&
              commitCachePassiveMountEffect(
                finishedWork.alternate,
                finishedWork
              );
            break;
          default:
            recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
        }
        parentFiber = parentFiber.sibling;
      }
  }
  function recursivelyAccumulateSuspenseyCommit(parentFiber) {
    if (parentFiber.subtreeFlags & suspenseyCommitFlag)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        accumulateSuspenseyCommitOnFiber(parentFiber),
          (parentFiber = parentFiber.sibling);
  }
  function accumulateSuspenseyCommitOnFiber(fiber) {
    switch (fiber.tag) {
      case 26:
        recursivelyAccumulateSuspenseyCommit(fiber);
        fiber.flags & suspenseyCommitFlag &&
          (null !== fiber.memoizedState
            ? suspendResource(
                currentHoistableRoot,
                fiber.memoizedState,
                fiber.memoizedProps
              )
            : suspendInstance(fiber.type, fiber.memoizedProps));
        break;
      case 5:
        recursivelyAccumulateSuspenseyCommit(fiber);
        fiber.flags & suspenseyCommitFlag &&
          suspendInstance(fiber.type, fiber.memoizedProps);
        break;
      case 3:
      case 4:
        if (supportsResources) {
          var previousHoistableRoot = currentHoistableRoot;
          currentHoistableRoot = getHoistableRoot(
            fiber.stateNode.containerInfo
          );
          recursivelyAccumulateSuspenseyCommit(fiber);
          currentHoistableRoot = previousHoistableRoot;
        } else recursivelyAccumulateSuspenseyCommit(fiber);
        break;
      case 22:
        null === fiber.memoizedState &&
          ((previousHoistableRoot = fiber.alternate),
          null !== previousHoistableRoot &&
          null !== previousHoistableRoot.memoizedState
            ? ((previousHoistableRoot = suspenseyCommitFlag),
              (suspenseyCommitFlag = 16777216),
              recursivelyAccumulateSuspenseyCommit(fiber),
              (suspenseyCommitFlag = previousHoistableRoot))
            : recursivelyAccumulateSuspenseyCommit(fiber));
        break;
      default:
        recursivelyAccumulateSuspenseyCommit(fiber);
    }
  }
  function detachAlternateSiblings(parentFiber) {
    var previousFiber = parentFiber.alternate;
    if (
      null !== previousFiber &&
      ((parentFiber = previousFiber.child), null !== parentFiber)
    ) {
      previousFiber.child = null;
      do
        (previousFiber = parentFiber.sibling),
          (parentFiber.sibling = null),
          (parentFiber = previousFiber);
      while (null !== parentFiber);
    }
  }
  function commitHookPassiveUnmountEffects(
    finishedWork,
    nearestMountedAncestor,
    hookFlags
  ) {
    shouldProfile(finishedWork)
      ? ((passiveEffectStartTime = now()),
        commitHookEffectListUnmount(
          hookFlags,
          finishedWork,
          nearestMountedAncestor
        ),
        recordPassiveEffectDuration(finishedWork))
      : commitHookEffectListUnmount(
          hookFlags,
          finishedWork,
          nearestMountedAncestor
        );
  }
  function recursivelyTraversePassiveUnmountEffects(parentFiber) {
    var deletions = parentFiber.deletions;
    if (0 !== (parentFiber.flags & 16)) {
      if (null !== deletions)
        for (var i = 0; i < deletions.length; i++) {
          var childToDelete = deletions[i];
          nextEffect = childToDelete;
          commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
            childToDelete,
            parentFiber
          );
        }
      detachAlternateSiblings(parentFiber);
    }
    if (parentFiber.subtreeFlags & 10256)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitPassiveUnmountOnFiber(parentFiber),
          (parentFiber = parentFiber.sibling);
  }
  function commitPassiveUnmountOnFiber(finishedWork) {
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
        finishedWork.flags & 2048 &&
          commitHookPassiveUnmountEffects(finishedWork, finishedWork.return, 9);
        break;
      case 22:
        var instance = finishedWork.stateNode;
        null !== finishedWork.memoizedState &&
        instance._visibility & 4 &&
        (null === finishedWork.return || 13 !== finishedWork.return.tag)
          ? ((instance._visibility &= -5),
            recursivelyTraverseDisconnectPassiveEffects(finishedWork))
          : recursivelyTraversePassiveUnmountEffects(finishedWork);
        break;
      default:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
    }
  }
  function recursivelyTraverseDisconnectPassiveEffects(parentFiber) {
    var deletions = parentFiber.deletions;
    if (0 !== (parentFiber.flags & 16)) {
      if (null !== deletions)
        for (var i = 0; i < deletions.length; i++) {
          var childToDelete = deletions[i];
          nextEffect = childToDelete;
          commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
            childToDelete,
            parentFiber
          );
        }
      detachAlternateSiblings(parentFiber);
    }
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      deletions = parentFiber;
      switch (deletions.tag) {
        case 0:
        case 11:
        case 15:
          commitHookPassiveUnmountEffects(deletions, deletions.return, 8);
          recursivelyTraverseDisconnectPassiveEffects(deletions);
          break;
        case 22:
          i = deletions.stateNode;
          i._visibility & 4 &&
            ((i._visibility &= -5),
            recursivelyTraverseDisconnectPassiveEffects(deletions));
          break;
        default:
          recursivelyTraverseDisconnectPassiveEffects(deletions);
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
    deletedSubtreeRoot,
    nearestMountedAncestor
  ) {
    for (; null !== nextEffect; ) {
      var fiber = nextEffect;
      switch (fiber.tag) {
        case 0:
        case 11:
        case 15:
          commitHookPassiveUnmountEffects(fiber, nearestMountedAncestor, 8);
          break;
        case 23:
        case 22:
          if (
            null !== fiber.memoizedState &&
            null !== fiber.memoizedState.cachePool
          ) {
            var cache = fiber.memoizedState.cachePool.pool;
            null != cache && cache.refCount++;
          }
          break;
        case 24:
          releaseCache(fiber.memoizedState.cache);
      }
      cache = fiber.child;
      if (null !== cache) (cache.return = fiber), (nextEffect = cache);
      else
        a: for (fiber = deletedSubtreeRoot; null !== nextEffect; ) {
          cache = nextEffect;
          var sibling = cache.sibling,
            returnFiber = cache.return;
          detachFiberAfterEffects(cache);
          if (cache === fiber) {
            nextEffect = null;
            break a;
          }
          if (null !== sibling) {
            sibling.return = returnFiber;
            nextEffect = sibling;
            break a;
          }
          nextEffect = returnFiber;
        }
    }
  }
  function findFiberRootForHostRoot(hostRoot) {
    var maybeFiber = getInstanceFromNode(hostRoot);
    if (null != maybeFiber) {
      if ("string" !== typeof maybeFiber.memoizedProps["data-testname"])
        throw Error(formatProdErrorMessage(364));
      return maybeFiber;
    }
    hostRoot = findFiberRoot(hostRoot);
    if (null === hostRoot) throw Error(formatProdErrorMessage(362));
    return hostRoot.stateNode.current;
  }
  function matchSelector(fiber$jscomp$0, selector) {
    var tag = fiber$jscomp$0.tag;
    switch (selector.$$typeof) {
      case COMPONENT_TYPE:
        if (fiber$jscomp$0.type === selector.value) return !0;
        break;
      case HAS_PSEUDO_CLASS_TYPE:
        a: {
          selector = selector.value;
          fiber$jscomp$0 = [fiber$jscomp$0, 0];
          for (tag = 0; tag < fiber$jscomp$0.length; ) {
            var fiber = fiber$jscomp$0[tag++],
              tag$jscomp$0 = fiber.tag,
              selectorIndex = fiber$jscomp$0[tag++],
              selector$jscomp$0 = selector[selectorIndex];
            if (
              (5 !== tag$jscomp$0 &&
                26 !== tag$jscomp$0 &&
                27 !== tag$jscomp$0) ||
              !isHiddenSubtree(fiber)
            ) {
              for (
                ;
                null != selector$jscomp$0 &&
                matchSelector(fiber, selector$jscomp$0);

              )
                selectorIndex++, (selector$jscomp$0 = selector[selectorIndex]);
              if (selectorIndex === selector.length) {
                selector = !0;
                break a;
              } else
                for (fiber = fiber.child; null !== fiber; )
                  fiber$jscomp$0.push(fiber, selectorIndex),
                    (fiber = fiber.sibling);
            }
          }
          selector = !1;
        }
        return selector;
      case ROLE_TYPE:
        if (
          (5 === tag || 26 === tag || 27 === tag) &&
          matchAccessibilityRole(fiber$jscomp$0.stateNode, selector.value)
        )
          return !0;
        break;
      case TEXT_TYPE:
        if (5 === tag || 6 === tag || 26 === tag || 27 === tag)
          if (
            ((fiber$jscomp$0 = getTextContent(fiber$jscomp$0)),
            null !== fiber$jscomp$0 &&
              0 <= fiber$jscomp$0.indexOf(selector.value))
          )
            return !0;
        break;
      case TEST_NAME_TYPE:
        if (5 === tag || 26 === tag || 27 === tag)
          if (
            ((fiber$jscomp$0 = fiber$jscomp$0.memoizedProps["data-testname"]),
            "string" === typeof fiber$jscomp$0 &&
              fiber$jscomp$0.toLowerCase() === selector.value.toLowerCase())
          )
            return !0;
        break;
      default:
        throw Error(formatProdErrorMessage(365));
    }
    return !1;
  }
  function selectorToString(selector) {
    switch (selector.$$typeof) {
      case COMPONENT_TYPE:
        return (
          "<" + (getComponentNameFromType(selector.value) || "Unknown") + ">"
        );
      case HAS_PSEUDO_CLASS_TYPE:
        return ":has(" + (selectorToString(selector) || "") + ")";
      case ROLE_TYPE:
        return '[role="' + selector.value + '"]';
      case TEXT_TYPE:
        return '"' + selector.value + '"';
      case TEST_NAME_TYPE:
        return '[data-testname="' + selector.value + '"]';
      default:
        throw Error(formatProdErrorMessage(365));
    }
  }
  function findPaths(root, selectors) {
    var matchingFibers = [];
    root = [root, 0];
    for (var index = 0; index < root.length; ) {
      var fiber = root[index++],
        tag = fiber.tag,
        selectorIndex = root[index++],
        selector = selectors[selectorIndex];
      if ((5 !== tag && 26 !== tag && 27 !== tag) || !isHiddenSubtree(fiber)) {
        for (; null != selector && matchSelector(fiber, selector); )
          selectorIndex++, (selector = selectors[selectorIndex]);
        if (selectorIndex === selectors.length) matchingFibers.push(fiber);
        else
          for (fiber = fiber.child; null !== fiber; )
            root.push(fiber, selectorIndex), (fiber = fiber.sibling);
      }
    }
    return matchingFibers;
  }
  function findAllNodes(hostRoot, selectors) {
    if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
    hostRoot = findFiberRootForHostRoot(hostRoot);
    hostRoot = findPaths(hostRoot, selectors);
    selectors = [];
    hostRoot = Array.from(hostRoot);
    for (var index = 0; index < hostRoot.length; ) {
      var node = hostRoot[index++],
        tag = node.tag;
      if (5 === tag || 26 === tag || 27 === tag)
        isHiddenSubtree(node) || selectors.push(node.stateNode);
      else
        for (node = node.child; null !== node; )
          hostRoot.push(node), (node = node.sibling);
    }
    return selectors;
  }
  function requestUpdateLane() {
    if (0 !== (executionContext & 2) && 0 !== workInProgressRootRenderLanes)
      return workInProgressRootRenderLanes & -workInProgressRootRenderLanes;
    if (null !== ReactSharedInternals.T) {
      var actionScopeLane = currentEntangledLane;
      return 0 !== actionScopeLane ? actionScopeLane : requestTransitionLane();
    }
    return resolveUpdatePriority();
  }
  function requestDeferredLane() {
    0 === workInProgressDeferredLane &&
      (workInProgressDeferredLane =
        0 === (workInProgressRootRenderLanes & 536870912) || isHydrating
          ? claimNextTransitionLane()
          : 536870912);
    var suspenseHandler = suspenseHandlerStackCursor.current;
    null !== suspenseHandler && (suspenseHandler.flags |= 32);
    return workInProgressDeferredLane;
  }
  function scheduleUpdateOnFiber(root, fiber, lane) {
    if (
      (root === workInProgressRoot && 2 === workInProgressSuspendedReason) ||
      null !== root.cancelPendingCommit
    )
      prepareFreshStack(root, 0),
        markRootSuspended(
          root,
          workInProgressRootRenderLanes,
          workInProgressDeferredLane
        );
    markRootUpdated(root, lane);
    if (0 === (executionContext & 2) || root !== workInProgressRoot)
      isDevToolsPresent && addFiberToLanesMap(root, fiber, lane),
        root === workInProgressRoot &&
          (0 === (executionContext & 2) &&
            (workInProgressRootInterleavedUpdatedLanes |= lane),
          4 === workInProgressRootExitStatus &&
            markRootSuspended(
              root,
              workInProgressRootRenderLanes,
              workInProgressDeferredLane
            )),
        ensureRootIsScheduled(root);
  }
  function performConcurrentWorkOnRoot(root, didTimeout) {
    nestedUpdateScheduled = currentUpdateIsNested = !1;
    if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
    var originalCallbackNode = root.callbackNode;
    if (flushPassiveEffects() && root.callbackNode !== originalCallbackNode)
      return null;
    var lanes = getNextLanes(
      root,
      root === workInProgressRoot ? workInProgressRootRenderLanes : 0
    );
    if (0 === lanes) return null;
    var shouldTimeSlice =
      0 === (lanes & 60) && 0 === (lanes & root.expiredLanes) && !didTimeout;
    didTimeout = shouldTimeSlice
      ? renderRootConcurrent(root, lanes)
      : renderRootSync(root, lanes);
    if (0 !== didTimeout) {
      var renderWasConcurrent = shouldTimeSlice;
      do {
        if (6 === didTimeout) markRootSuspended(root, lanes, 0);
        else {
          shouldTimeSlice = root.current.alternate;
          if (
            renderWasConcurrent &&
            !isRenderConsistentWithExternalStores(shouldTimeSlice)
          ) {
            didTimeout = renderRootSync(root, lanes);
            renderWasConcurrent = !1;
            continue;
          }
          if (2 === didTimeout) {
            renderWasConcurrent = lanes;
            var errorRetryLanes = getLanesToRetrySynchronouslyOnError(
              root,
              renderWasConcurrent
            );
            if (
              0 !== errorRetryLanes &&
              ((lanes = errorRetryLanes),
              (didTimeout = recoverFromConcurrentError(
                root,
                renderWasConcurrent,
                errorRetryLanes
              )),
              (renderWasConcurrent = !1),
              2 !== didTimeout)
            )
              continue;
          }
          if (1 === didTimeout) {
            prepareFreshStack(root, 0);
            markRootSuspended(root, lanes, 0);
            break;
          }
          root.finishedWork = shouldTimeSlice;
          root.finishedLanes = lanes;
          a: {
            renderWasConcurrent = root;
            switch (didTimeout) {
              case 0:
              case 1:
                throw Error(formatProdErrorMessage(345));
              case 4:
                if ((lanes & 4194176) === lanes) {
                  markRootSuspended(
                    renderWasConcurrent,
                    lanes,
                    workInProgressDeferredLane
                  );
                  break a;
                }
                break;
              case 2:
                workInProgressRootRecoverableErrors = null;
                break;
              case 3:
              case 5:
                break;
              default:
                throw Error(formatProdErrorMessage(329));
            }
            if (
              (lanes & 62914560) === lanes &&
              ((didTimeout = globalMostRecentFallbackTime + 300 - now$1()),
              10 < didTimeout)
            ) {
              markRootSuspended(
                renderWasConcurrent,
                lanes,
                workInProgressDeferredLane
              );
              if (0 !== getNextLanes(renderWasConcurrent, 0)) break a;
              renderWasConcurrent.timeoutHandle = scheduleTimeout(
                commitRootWhenReady.bind(
                  null,
                  renderWasConcurrent,
                  shouldTimeSlice,
                  workInProgressRootRecoverableErrors,
                  workInProgressTransitions,
                  workInProgressRootDidIncludeRecursiveRenderUpdate,
                  lanes,
                  workInProgressDeferredLane
                ),
                didTimeout
              );
              break a;
            }
            commitRootWhenReady(
              renderWasConcurrent,
              shouldTimeSlice,
              workInProgressRootRecoverableErrors,
              workInProgressTransitions,
              workInProgressRootDidIncludeRecursiveRenderUpdate,
              lanes,
              workInProgressDeferredLane
            );
          }
        }
        break;
      } while (1);
    }
    ensureRootIsScheduled(root);
    scheduleTaskForRootDuringMicrotask(root, now$1());
    root =
      root.callbackNode === originalCallbackNode
        ? performConcurrentWorkOnRoot.bind(null, root)
        : null;
    return root;
  }
  function recoverFromConcurrentError(
    root,
    originallyAttemptedLanes,
    errorRetryLanes
  ) {
    var errorsFromFirstAttempt = workInProgressRootConcurrentErrors,
      wasRootDehydrated =
        supportsHydration && root.current.memoizedState.isDehydrated;
    wasRootDehydrated &&
      (prepareFreshStack(root, errorRetryLanes).flags |= 256);
    errorRetryLanes = renderRootSync(root, errorRetryLanes);
    if (2 !== errorRetryLanes) {
      if (workInProgressRootDidAttachPingListener && !wasRootDehydrated)
        return (
          (root.errorRecoveryDisabledLanes |= originallyAttemptedLanes),
          (workInProgressRootInterleavedUpdatedLanes |=
            originallyAttemptedLanes),
          4
        );
      root = workInProgressRootRecoverableErrors;
      workInProgressRootRecoverableErrors = errorsFromFirstAttempt;
      null !== root && queueRecoverableErrors(root);
    }
    return errorRetryLanes;
  }
  function queueRecoverableErrors(errors) {
    null === workInProgressRootRecoverableErrors
      ? (workInProgressRootRecoverableErrors = errors)
      : workInProgressRootRecoverableErrors.push.apply(
          workInProgressRootRecoverableErrors,
          errors
        );
  }
  function commitRootWhenReady(
    root,
    finishedWork,
    recoverableErrors,
    transitions,
    didIncludeRenderPhaseUpdate,
    lanes,
    spawnedLane
  ) {
    var subtreeFlags = finishedWork.subtreeFlags;
    if (subtreeFlags & 8192 || 16785408 === (subtreeFlags & 16785408))
      if (
        (startSuspendingCommit(),
        accumulateSuspenseyCommitOnFiber(finishedWork),
        (finishedWork = waitForCommitToBeReady()),
        null !== finishedWork)
      ) {
        root.cancelPendingCommit = finishedWork(
          commitRoot.bind(
            null,
            root,
            recoverableErrors,
            transitions,
            didIncludeRenderPhaseUpdate
          )
        );
        markRootSuspended(root, lanes, spawnedLane);
        return;
      }
    commitRoot(
      root,
      recoverableErrors,
      transitions,
      didIncludeRenderPhaseUpdate,
      spawnedLane
    );
  }
  function isRenderConsistentWithExternalStores(finishedWork) {
    for (var node = finishedWork; ; ) {
      if (node.flags & 16384) {
        var updateQueue = node.updateQueue;
        if (
          null !== updateQueue &&
          ((updateQueue = updateQueue.stores), null !== updateQueue)
        )
          for (var i = 0; i < updateQueue.length; i++) {
            var check = updateQueue[i],
              getSnapshot = check.getSnapshot;
            check = check.value;
            try {
              if (!objectIs(getSnapshot(), check)) return !1;
            } catch (error) {
              return !1;
            }
          }
      }
      updateQueue = node.child;
      if (node.subtreeFlags & 16384 && null !== updateQueue)
        (updateQueue.return = node), (node = updateQueue);
      else {
        if (node === finishedWork) break;
        for (; null === node.sibling; ) {
          if (null === node.return || node.return === finishedWork) return !0;
          node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
      }
    }
    return !0;
  }
  function markRootUpdated(root, updatedLanes) {
    root.pendingLanes |= updatedLanes;
    268435456 !== updatedLanes &&
      ((root.suspendedLanes = 0), (root.pingedLanes = 0));
    executionContext & 2
      ? (workInProgressRootDidIncludeRecursiveRenderUpdate = !0)
      : executionContext & 4 && (didIncludeCommitPhaseUpdate = !0);
    throwIfInfiniteUpdateLoopDetected();
  }
  function markRootSuspended(root, suspendedLanes, spawnedLane) {
    suspendedLanes &= ~workInProgressRootPingedLanes;
    suspendedLanes &= ~workInProgressRootInterleavedUpdatedLanes;
    root.suspendedLanes |= suspendedLanes;
    root.pingedLanes &= ~suspendedLanes;
    for (
      var expirationTimes = root.expirationTimes, lanes = suspendedLanes;
      0 < lanes;

    ) {
      var index$5 = 31 - clz32(lanes),
        lane = 1 << index$5;
      expirationTimes[index$5] = -1;
      lanes &= ~lane;
    }
    0 !== spawnedLane &&
      markSpawnedDeferredLane(root, spawnedLane, suspendedLanes);
  }
  function performSyncWorkOnRoot(root, lanes) {
    if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
    if (flushPassiveEffects()) return ensureRootIsScheduled(root), null;
    currentUpdateIsNested = nestedUpdateScheduled;
    nestedUpdateScheduled = !1;
    var exitStatus = renderRootSync(root, lanes);
    if (2 === exitStatus) {
      var originallyAttemptedLanes = lanes,
        errorRetryLanes = getLanesToRetrySynchronouslyOnError(
          root,
          originallyAttemptedLanes
        );
      0 !== errorRetryLanes &&
        ((lanes = errorRetryLanes),
        (exitStatus = recoverFromConcurrentError(
          root,
          originallyAttemptedLanes,
          errorRetryLanes
        )));
    }
    if (1 === exitStatus)
      return (
        prepareFreshStack(root, 0),
        markRootSuspended(root, lanes, 0),
        ensureRootIsScheduled(root),
        null
      );
    if (6 === exitStatus)
      return (
        markRootSuspended(root, lanes, workInProgressDeferredLane),
        ensureRootIsScheduled(root),
        null
      );
    root.finishedWork = root.current.alternate;
    root.finishedLanes = lanes;
    commitRoot(
      root,
      workInProgressRootRecoverableErrors,
      workInProgressTransitions,
      workInProgressRootDidIncludeRecursiveRenderUpdate,
      workInProgressDeferredLane
    );
    ensureRootIsScheduled(root);
    return null;
  }
  function flushSyncWork() {
    return 0 === (executionContext & 6)
      ? (flushSyncWorkAcrossRoots_impl(!1), !1)
      : !0;
  }
  function resetWorkInProgressStack() {
    if (null !== workInProgress) {
      if (0 === workInProgressSuspendedReason)
        var interruptedWork = workInProgress.return;
      else
        (interruptedWork = workInProgress),
          resetContextDependencies(),
          resetHooksOnUnwind(interruptedWork),
          (thenableState$1 = null),
          (thenableIndexCounter$1 = 0),
          (interruptedWork = workInProgress);
      for (; null !== interruptedWork; )
        unwindInterruptedWork(interruptedWork.alternate, interruptedWork),
          (interruptedWork = interruptedWork.return);
      workInProgress = null;
    }
  }
  function prepareFreshStack(root, lanes) {
    root.finishedWork = null;
    root.finishedLanes = 0;
    var timeoutHandle = root.timeoutHandle;
    timeoutHandle !== noTimeout &&
      ((root.timeoutHandle = noTimeout), cancelTimeout(timeoutHandle));
    timeoutHandle = root.cancelPendingCommit;
    null !== timeoutHandle &&
      ((root.cancelPendingCommit = null), timeoutHandle());
    resetWorkInProgressStack();
    workInProgressRoot = root;
    workInProgress = timeoutHandle = createWorkInProgress(root.current, null);
    workInProgressRootRenderLanes = lanes;
    workInProgressSuspendedReason = 0;
    workInProgressThrownValue = null;
    workInProgressRootDidAttachPingListener = !1;
    workInProgressDeferredLane =
      workInProgressRootPingedLanes =
      workInProgressRootInterleavedUpdatedLanes =
      workInProgressRootSkippedLanes =
      workInProgressRootExitStatus =
        0;
    workInProgressRootRecoverableErrors = workInProgressRootConcurrentErrors =
      null;
    workInProgressRootDidIncludeRecursiveRenderUpdate = !1;
    0 !== (lanes & 8) && (lanes |= lanes & 32);
    var allEntangledLanes = root.entangledLanes;
    if (0 !== allEntangledLanes)
      for (
        root = root.entanglements, allEntangledLanes &= lanes;
        0 < allEntangledLanes;

      ) {
        var index$3 = 31 - clz32(allEntangledLanes),
          lane = 1 << index$3;
        lanes |= root[index$3];
        allEntangledLanes &= ~lane;
      }
    entangledRenderLanes = lanes;
    finishQueueingConcurrentUpdates();
    return timeoutHandle;
  }
  function handleThrow(root, thrownValue) {
    currentlyRenderingFiber$1 = null;
    ReactSharedInternals.H = ContextOnlyDispatcher;
    thrownValue === SuspenseException
      ? ((thrownValue = getSuspendedThenable()),
        (workInProgressSuspendedReason =
          shouldRemainOnPreviousScreen() &&
          0 === (workInProgressRootSkippedLanes & 134217727) &&
          0 === (workInProgressRootInterleavedUpdatedLanes & 134217727)
            ? 2
            : 3))
      : thrownValue === SuspenseyCommitException
      ? ((thrownValue = getSuspendedThenable()),
        (workInProgressSuspendedReason = 4))
      : (workInProgressSuspendedReason =
          thrownValue === SelectiveHydrationException
            ? 8
            : null !== thrownValue &&
              "object" === typeof thrownValue &&
              "function" === typeof thrownValue.then
            ? 6
            : 1);
    workInProgressThrownValue = thrownValue;
    var erroredWork = workInProgress;
    if (null === erroredWork)
      (workInProgressRootExitStatus = 1),
        logUncaughtError(
          root,
          createCapturedValueAtFiber(thrownValue, root.current)
        );
    else
      switch (
        (erroredWork.mode & 2 &&
          stopProfilerTimerIfRunningAndRecordDelta(erroredWork, !0),
        markComponentRenderStopped(),
        workInProgressSuspendedReason)
      ) {
        case 1:
          null !== injectedProfilingHooks &&
            "function" === typeof injectedProfilingHooks.markComponentErrored &&
            injectedProfilingHooks.markComponentErrored(
              erroredWork,
              thrownValue,
              workInProgressRootRenderLanes
            );
          break;
        case 2:
        case 3:
        case 6:
        case 7:
          null !== injectedProfilingHooks &&
            "function" ===
              typeof injectedProfilingHooks.markComponentSuspended &&
            injectedProfilingHooks.markComponentSuspended(
              erroredWork,
              thrownValue,
              workInProgressRootRenderLanes
            );
      }
  }
  function shouldRemainOnPreviousScreen() {
    var handler = suspenseHandlerStackCursor.current;
    return null === handler
      ? !0
      : (workInProgressRootRenderLanes & 4194176) ===
        workInProgressRootRenderLanes
      ? null === shellBoundary
        ? !0
        : !1
      : (workInProgressRootRenderLanes & 62914560) ===
          workInProgressRootRenderLanes ||
        0 !== (workInProgressRootRenderLanes & 536870912)
      ? handler === shellBoundary
      : !1;
  }
  function pushDispatcher() {
    var prevDispatcher = ReactSharedInternals.H;
    ReactSharedInternals.H = ContextOnlyDispatcher;
    return null === prevDispatcher ? ContextOnlyDispatcher : prevDispatcher;
  }
  function pushAsyncDispatcher() {
    var prevAsyncDispatcher = ReactSharedInternals.A;
    ReactSharedInternals.A = DefaultAsyncDispatcher;
    return prevAsyncDispatcher;
  }
  function renderDidSuspendDelayIfPossible() {
    workInProgressRootExitStatus = 4;
    (0 === (workInProgressRootSkippedLanes & 134217727) &&
      0 === (workInProgressRootInterleavedUpdatedLanes & 134217727)) ||
      null === workInProgressRoot ||
      markRootSuspended(
        workInProgressRoot,
        workInProgressRootRenderLanes,
        workInProgressDeferredLane
      );
  }
  function renderRootSync(root, lanes) {
    var prevExecutionContext = executionContext;
    executionContext |= 2;
    var prevDispatcher = pushDispatcher(),
      prevAsyncDispatcher = pushAsyncDispatcher();
    if (
      workInProgressRoot !== root ||
      workInProgressRootRenderLanes !== lanes
    ) {
      if (isDevToolsPresent) {
        var memoizedUpdaters = root.memoizedUpdaters;
        0 < memoizedUpdaters.size &&
          (restorePendingUpdaters(root, workInProgressRootRenderLanes),
          memoizedUpdaters.clear());
        movePendingFibersToMemoized(root, lanes);
      }
      workInProgressTransitions = null;
      prepareFreshStack(root, lanes);
    }
    markRenderStarted(lanes);
    lanes = !1;
    a: do
      try {
        if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
          memoizedUpdaters = workInProgress;
          var thrownValue = workInProgressThrownValue;
          switch (workInProgressSuspendedReason) {
            case 8:
              resetWorkInProgressStack();
              workInProgressRootExitStatus = 6;
              break a;
            case 3:
            case 2:
              lanes ||
                null !== suspenseHandlerStackCursor.current ||
                (lanes = !0);
            default:
              (workInProgressSuspendedReason = 0),
                (workInProgressThrownValue = null),
                throwAndUnwindWorkLoop(root, memoizedUpdaters, thrownValue);
          }
        }
        workLoopSync();
        break;
      } catch (thrownValue$172) {
        handleThrow(root, thrownValue$172);
      }
    while (1);
    lanes && root.shellSuspendCounter++;
    resetContextDependencies();
    executionContext = prevExecutionContext;
    ReactSharedInternals.H = prevDispatcher;
    ReactSharedInternals.A = prevAsyncDispatcher;
    if (null !== workInProgress) throw Error(formatProdErrorMessage(261));
    markRenderStopped();
    workInProgressRoot = null;
    workInProgressRootRenderLanes = 0;
    finishQueueingConcurrentUpdates();
    return workInProgressRootExitStatus;
  }
  function workLoopSync() {
    for (; null !== workInProgress; ) performUnitOfWork(workInProgress);
  }
  function renderRootConcurrent(root, lanes) {
    var prevExecutionContext = executionContext;
    executionContext |= 2;
    var prevDispatcher = pushDispatcher(),
      prevAsyncDispatcher = pushAsyncDispatcher();
    if (
      workInProgressRoot !== root ||
      workInProgressRootRenderLanes !== lanes
    ) {
      if (isDevToolsPresent) {
        var memoizedUpdaters = root.memoizedUpdaters;
        0 < memoizedUpdaters.size &&
          (restorePendingUpdaters(root, workInProgressRootRenderLanes),
          memoizedUpdaters.clear());
        movePendingFibersToMemoized(root, lanes);
      }
      workInProgressTransitions = null;
      workInProgressRootRenderTargetTime = now$1() + 500;
      prepareFreshStack(root, lanes);
    }
    markRenderStarted(lanes);
    a: do
      try {
        if (0 !== workInProgressSuspendedReason && null !== workInProgress)
          b: switch (
            ((lanes = workInProgress),
            (memoizedUpdaters = workInProgressThrownValue),
            workInProgressSuspendedReason)
          ) {
            case 1:
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root, lanes, memoizedUpdaters);
              break;
            case 2:
              if (isThenableResolved(memoizedUpdaters)) {
                workInProgressSuspendedReason = 0;
                workInProgressThrownValue = null;
                replaySuspendedUnitOfWork(lanes);
                break;
              }
              lanes = function () {
                2 === workInProgressSuspendedReason &&
                  workInProgressRoot === root &&
                  (workInProgressSuspendedReason = 7);
                ensureRootIsScheduled(root);
              };
              memoizedUpdaters.then(lanes, lanes);
              break a;
            case 3:
              workInProgressSuspendedReason = 7;
              break a;
            case 4:
              workInProgressSuspendedReason = 5;
              break a;
            case 7:
              isThenableResolved(memoizedUpdaters)
                ? ((workInProgressSuspendedReason = 0),
                  (workInProgressThrownValue = null),
                  replaySuspendedUnitOfWork(lanes))
                : ((workInProgressSuspendedReason = 0),
                  (workInProgressThrownValue = null),
                  throwAndUnwindWorkLoop(root, lanes, memoizedUpdaters));
              break;
            case 5:
              var resource = null;
              switch (workInProgress.tag) {
                case 26:
                  resource = workInProgress.memoizedState;
                case 5:
                case 27:
                  var hostFiber = workInProgress,
                    type = hostFiber.type,
                    props = hostFiber.pendingProps;
                  if (
                    resource
                      ? preloadResource(resource)
                      : preloadInstance(type, props)
                  ) {
                    workInProgressSuspendedReason = 0;
                    workInProgressThrownValue = null;
                    var sibling = hostFiber.sibling;
                    if (null !== sibling) workInProgress = sibling;
                    else {
                      var returnFiber = hostFiber.return;
                      null !== returnFiber
                        ? ((workInProgress = returnFiber),
                          completeUnitOfWork(returnFiber))
                        : (workInProgress = null);
                    }
                    break b;
                  }
              }
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root, lanes, memoizedUpdaters);
              break;
            case 6:
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root, lanes, memoizedUpdaters);
              break;
            case 8:
              resetWorkInProgressStack();
              workInProgressRootExitStatus = 6;
              break a;
            default:
              throw Error(formatProdErrorMessage(462));
          }
        workLoopConcurrent();
        break;
      } catch (thrownValue$174) {
        handleThrow(root, thrownValue$174);
      }
    while (1);
    resetContextDependencies();
    ReactSharedInternals.H = prevDispatcher;
    ReactSharedInternals.A = prevAsyncDispatcher;
    executionContext = prevExecutionContext;
    if (null !== workInProgress)
      return (
        null !== injectedProfilingHooks &&
          "function" === typeof injectedProfilingHooks.markRenderYielded &&
          injectedProfilingHooks.markRenderYielded(),
        0
      );
    markRenderStopped();
    workInProgressRoot = null;
    workInProgressRootRenderLanes = 0;
    finishQueueingConcurrentUpdates();
    return workInProgressRootExitStatus;
  }
  function workLoopConcurrent() {
    for (; null !== workInProgress && !shouldYield(); )
      performUnitOfWork(workInProgress);
  }
  function performUnitOfWork(unitOfWork) {
    var current = unitOfWork.alternate;
    0 !== (unitOfWork.mode & 2)
      ? (startProfilerTimer(unitOfWork),
        (current = beginWork(current, unitOfWork, entangledRenderLanes)),
        stopProfilerTimerIfRunningAndRecordDelta(unitOfWork, !0))
      : (current = beginWork(current, unitOfWork, entangledRenderLanes));
    unitOfWork.memoizedProps = unitOfWork.pendingProps;
    null === current
      ? completeUnitOfWork(unitOfWork)
      : (workInProgress = current);
  }
  function replaySuspendedUnitOfWork(unitOfWork) {
    var next = unitOfWork;
    var current = next.alternate,
      isProfilingMode = 0 !== (next.mode & 2);
    isProfilingMode && startProfilerTimer(next);
    switch (next.tag) {
      case 15:
      case 0:
        current = replayFunctionComponent(
          current,
          next,
          next.pendingProps,
          next.type,
          void 0,
          workInProgressRootRenderLanes
        );
        break;
      case 11:
        current = replayFunctionComponent(
          current,
          next,
          next.pendingProps,
          next.type.render,
          next.ref,
          workInProgressRootRenderLanes
        );
        break;
      case 5:
        resetHooksOnUnwind(next);
      default:
        unwindInterruptedWork(current, next),
          (next = workInProgress =
            resetWorkInProgress(next, entangledRenderLanes)),
          (current = beginWork(current, next, entangledRenderLanes));
    }
    isProfilingMode && stopProfilerTimerIfRunningAndRecordDelta(next, !0);
    next = current;
    unitOfWork.memoizedProps = unitOfWork.pendingProps;
    null === next ? completeUnitOfWork(unitOfWork) : (workInProgress = next);
  }
  function throwAndUnwindWorkLoop(root, unitOfWork, thrownValue) {
    resetContextDependencies();
    resetHooksOnUnwind(unitOfWork);
    thenableState$1 = null;
    thenableIndexCounter$1 = 0;
    var returnFiber = unitOfWork.return;
    try {
      if (
        throwException(
          root,
          returnFiber,
          unitOfWork,
          thrownValue,
          workInProgressRootRenderLanes
        )
      ) {
        workInProgressRootExitStatus = 1;
        logUncaughtError(
          root,
          createCapturedValueAtFiber(thrownValue, root.current)
        );
        workInProgress = null;
        return;
      }
    } catch (error) {
      if (null !== returnFiber) throw ((workInProgress = returnFiber), error);
      workInProgressRootExitStatus = 1;
      logUncaughtError(
        root,
        createCapturedValueAtFiber(thrownValue, root.current)
      );
      workInProgress = null;
      return;
    }
    if (unitOfWork.flags & 32768)
      a: {
        root = unitOfWork;
        do {
          unitOfWork = unwindWork(root.alternate, root);
          if (null !== unitOfWork) {
            unitOfWork.flags &= 32767;
            workInProgress = unitOfWork;
            break a;
          }
          if (0 !== (root.mode & 2)) {
            stopProfilerTimerIfRunningAndRecordDelta(root, !1);
            unitOfWork = root.actualDuration;
            for (thrownValue = root.child; null !== thrownValue; )
              (unitOfWork += thrownValue.actualDuration),
                (thrownValue = thrownValue.sibling);
            root.actualDuration = unitOfWork;
          }
          root = root.return;
          null !== root &&
            ((root.flags |= 32768),
            (root.subtreeFlags = 0),
            (root.deletions = null));
          workInProgress = root;
        } while (null !== root);
        workInProgressRootExitStatus = 6;
        workInProgress = null;
      }
    else completeUnitOfWork(unitOfWork);
  }
  function completeUnitOfWork(unitOfWork) {
    var completedWork = unitOfWork;
    do {
      var current = completedWork.alternate;
      unitOfWork = completedWork.return;
      0 === (completedWork.mode & 2)
        ? (current = completeWork(current, completedWork, entangledRenderLanes))
        : (startProfilerTimer(completedWork),
          (current = completeWork(
            current,
            completedWork,
            entangledRenderLanes
          )),
          stopProfilerTimerIfRunningAndRecordDelta(completedWork, !1));
      if (null !== current) {
        workInProgress = current;
        return;
      }
      completedWork = completedWork.sibling;
      if (null !== completedWork) {
        workInProgress = completedWork;
        return;
      }
      workInProgress = completedWork = unitOfWork;
    } while (null !== completedWork);
    0 === workInProgressRootExitStatus && (workInProgressRootExitStatus = 5);
  }
  function commitRoot(
    root,
    recoverableErrors,
    transitions,
    didIncludeRenderPhaseUpdate,
    spawnedLane
  ) {
    var prevTransition = ReactSharedInternals.T,
      previousUpdateLanePriority = getCurrentUpdatePriority();
    try {
      setCurrentUpdatePriority(2),
        (ReactSharedInternals.T = null),
        commitRootImpl(
          root,
          recoverableErrors,
          transitions,
          didIncludeRenderPhaseUpdate,
          previousUpdateLanePriority,
          spawnedLane
        );
    } finally {
      (ReactSharedInternals.T = prevTransition),
        setCurrentUpdatePriority(previousUpdateLanePriority);
    }
    return null;
  }
  function commitRootImpl(
    root,
    recoverableErrors,
    transitions,
    didIncludeRenderPhaseUpdate,
    renderPriorityLevel,
    spawnedLane
  ) {
    do flushPassiveEffects();
    while (null !== rootWithPendingPassiveEffects);
    if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
    var finishedWork = root.finishedWork,
      lanes = root.finishedLanes;
    null !== injectedProfilingHooks &&
      "function" === typeof injectedProfilingHooks.markCommitStarted &&
      injectedProfilingHooks.markCommitStarted(lanes);
    if (null === finishedWork) return markCommitStopped(), null;
    root.finishedWork = null;
    root.finishedLanes = 0;
    if (finishedWork === root.current) throw Error(formatProdErrorMessage(177));
    root.callbackNode = null;
    root.callbackPriority = 0;
    root.cancelPendingCommit = null;
    var remainingLanes = finishedWork.lanes | finishedWork.childLanes;
    remainingLanes |= concurrentlyUpdatedLanes;
    markRootFinished(root, remainingLanes, spawnedLane);
    didIncludeCommitPhaseUpdate = !1;
    root === workInProgressRoot &&
      ((workInProgress = workInProgressRoot = null),
      (workInProgressRootRenderLanes = 0));
    (0 === (finishedWork.subtreeFlags & 10256) &&
      0 === (finishedWork.flags & 10256)) ||
      rootDoesHavePassiveEffects ||
      ((rootDoesHavePassiveEffects = !0),
      (pendingPassiveEffectsRemainingLanes = remainingLanes),
      (pendingPassiveTransitions = transitions),
      scheduleCallback(NormalPriority$1, function () {
        flushPassiveEffects();
        return null;
      }));
    transitions = 0 !== (finishedWork.flags & 15990);
    if (0 !== (finishedWork.subtreeFlags & 15990) || transitions) {
      transitions = ReactSharedInternals.T;
      ReactSharedInternals.T = null;
      spawnedLane = getCurrentUpdatePriority();
      setCurrentUpdatePriority(2);
      var prevExecutionContext = executionContext;
      executionContext |= 4;
      commitBeforeMutationEffects(root, finishedWork);
      commitTime = now();
      commitMutationEffects(root, finishedWork, lanes);
      resetAfterCommit(root.containerInfo);
      root.current = finishedWork;
      null !== injectedProfilingHooks &&
        "function" === typeof injectedProfilingHooks.markLayoutEffectsStarted &&
        injectedProfilingHooks.markLayoutEffectsStarted(lanes);
      commitLayoutEffects(finishedWork, root, lanes);
      null !== injectedProfilingHooks &&
        "function" === typeof injectedProfilingHooks.markLayoutEffectsStopped &&
        injectedProfilingHooks.markLayoutEffectsStopped();
      requestPaint();
      executionContext = prevExecutionContext;
      setCurrentUpdatePriority(spawnedLane);
      ReactSharedInternals.T = transitions;
    } else (root.current = finishedWork), (commitTime = now());
    rootDoesHavePassiveEffects
      ? ((rootDoesHavePassiveEffects = !1),
        (rootWithPendingPassiveEffects = root),
        (pendingPassiveEffectsLanes = lanes))
      : releaseRootPooledCache(root, remainingLanes);
    remainingLanes = root.pendingLanes;
    0 === remainingLanes && (legacyErrorBoundariesThatAlreadyFailed = null);
    onCommitRoot(finishedWork.stateNode, renderPriorityLevel);
    isDevToolsPresent && root.memoizedUpdaters.clear();
    ensureRootIsScheduled(root);
    if (null !== recoverableErrors)
      for (
        renderPriorityLevel = root.onRecoverableError, finishedWork = 0;
        finishedWork < recoverableErrors.length;
        finishedWork++
      )
        (remainingLanes = recoverableErrors[finishedWork]),
          renderPriorityLevel(remainingLanes.value, {
            componentStack: remainingLanes.stack
          });
    0 !== (pendingPassiveEffectsLanes & 3) && flushPassiveEffects();
    remainingLanes = root.pendingLanes;
    didIncludeRenderPhaseUpdate ||
    didIncludeCommitPhaseUpdate ||
    (0 !== (lanes & 4194218) && 0 !== (remainingLanes & 42))
      ? ((nestedUpdateScheduled = !0),
        root === rootWithNestedUpdates
          ? nestedUpdateCount++
          : ((nestedUpdateCount = 0), (rootWithNestedUpdates = root)))
      : (nestedUpdateCount = 0);
    flushSyncWorkAcrossRoots_impl(!1);
    markCommitStopped();
    return null;
  }
  function releaseRootPooledCache(root, remainingLanes) {
    0 === (root.pooledCacheLanes &= remainingLanes) &&
      ((remainingLanes = root.pooledCache),
      null != remainingLanes &&
        ((root.pooledCache = null), releaseCache(remainingLanes)));
  }
  function flushPassiveEffects() {
    if (null !== rootWithPendingPassiveEffects) {
      var root = rootWithPendingPassiveEffects,
        remainingLanes = pendingPassiveEffectsRemainingLanes;
      pendingPassiveEffectsRemainingLanes = 0;
      var renderPriority = lanesToEventPriority(pendingPassiveEffectsLanes),
        priority = 32 > renderPriority ? 32 : renderPriority;
      renderPriority = ReactSharedInternals.T;
      var previousPriority = getCurrentUpdatePriority();
      try {
        setCurrentUpdatePriority(priority);
        ReactSharedInternals.T = null;
        if (null === rootWithPendingPassiveEffects)
          var JSCompiler_inline_result = !1;
        else {
          var transitions = pendingPassiveTransitions;
          pendingPassiveTransitions = null;
          priority = rootWithPendingPassiveEffects;
          var lanes = pendingPassiveEffectsLanes;
          rootWithPendingPassiveEffects = null;
          pendingPassiveEffectsLanes = 0;
          if (0 !== (executionContext & 6))
            throw Error(formatProdErrorMessage(331));
          null !== injectedProfilingHooks &&
            "function" ===
              typeof injectedProfilingHooks.markPassiveEffectsStarted &&
            injectedProfilingHooks.markPassiveEffectsStarted(lanes);
          var prevExecutionContext = executionContext;
          executionContext |= 4;
          commitPassiveUnmountOnFiber(priority.current);
          commitPassiveMountOnFiber(
            priority,
            priority.current,
            lanes,
            transitions
          );
          transitions = pendingPassiveProfilerEffects;
          pendingPassiveProfilerEffects = [];
          for (lanes = 0; lanes < transitions.length; lanes++) {
            var finishedWork = transitions[lanes];
            if (executionContext & 4 && 0 !== (finishedWork.flags & 4))
              switch (finishedWork.tag) {
                case 12:
                  var passiveEffectDuration =
                      finishedWork.stateNode.passiveEffectDuration,
                    _finishedWork$memoize = finishedWork.memoizedProps,
                    id = _finishedWork$memoize.id,
                    onPostCommit = _finishedWork$memoize.onPostCommit,
                    commitTime$131 = commitTime,
                    phase =
                      null === finishedWork.alternate ? "mount" : "update";
                  currentUpdateIsNested && (phase = "nested-update");
                  "function" === typeof onPostCommit &&
                    onPostCommit(
                      id,
                      phase,
                      passiveEffectDuration,
                      commitTime$131
                    );
                  var parentFiber = finishedWork.return;
                  b: for (; null !== parentFiber; ) {
                    switch (parentFiber.tag) {
                      case 3:
                        parentFiber.stateNode.passiveEffectDuration +=
                          passiveEffectDuration;
                        break b;
                      case 12:
                        parentFiber.stateNode.passiveEffectDuration +=
                          passiveEffectDuration;
                        break b;
                    }
                    parentFiber = parentFiber.return;
                  }
              }
          }
          null !== injectedProfilingHooks &&
            "function" ===
              typeof injectedProfilingHooks.markPassiveEffectsStopped &&
            injectedProfilingHooks.markPassiveEffectsStopped();
          executionContext = prevExecutionContext;
          flushSyncWorkAcrossRoots_impl(!1);
          if (
            injectedHook &&
            "function" === typeof injectedHook.onPostCommitFiberRoot
          )
            try {
              injectedHook.onPostCommitFiberRoot(rendererID, priority);
            } catch (err) {}
          var stateNode = priority.current.stateNode;
          stateNode.effectDuration = 0;
          stateNode.passiveEffectDuration = 0;
          JSCompiler_inline_result = !0;
        }
        return JSCompiler_inline_result;
      } finally {
        setCurrentUpdatePriority(previousPriority),
          (ReactSharedInternals.T = renderPriority),
          releaseRootPooledCache(root, remainingLanes);
      }
    }
    return !1;
  }
  function enqueuePendingPassiveProfilerEffect(fiber) {
    pendingPassiveProfilerEffects.push(fiber);
    rootDoesHavePassiveEffects ||
      ((rootDoesHavePassiveEffects = !0),
      scheduleCallback(NormalPriority$1, function () {
        flushPassiveEffects();
        return null;
      }));
  }
  function captureCommitPhaseErrorOnRoot(rootFiber, sourceFiber, error) {
    sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
    sourceFiber = createRootErrorUpdate(rootFiber.stateNode, sourceFiber, 2);
    rootFiber = enqueueUpdate(rootFiber, sourceFiber, 2);
    null !== rootFiber &&
      (markRootUpdated(rootFiber, 2), ensureRootIsScheduled(rootFiber));
  }
  function captureCommitPhaseError(sourceFiber, nearestMountedAncestor, error) {
    if (3 === sourceFiber.tag)
      captureCommitPhaseErrorOnRoot(sourceFiber, sourceFiber, error);
    else
      for (; null !== nearestMountedAncestor; ) {
        if (3 === nearestMountedAncestor.tag) {
          captureCommitPhaseErrorOnRoot(
            nearestMountedAncestor,
            sourceFiber,
            error
          );
          break;
        } else if (1 === nearestMountedAncestor.tag) {
          var instance = nearestMountedAncestor.stateNode;
          if (
            "function" ===
              typeof nearestMountedAncestor.type.getDerivedStateFromError ||
            ("function" === typeof instance.componentDidCatch &&
              (null === legacyErrorBoundariesThatAlreadyFailed ||
                !legacyErrorBoundariesThatAlreadyFailed.has(instance)))
          ) {
            sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
            error = createClassErrorUpdate(2);
            instance = enqueueUpdate(nearestMountedAncestor, error, 2);
            null !== instance &&
              (initializeClassErrorUpdate(
                error,
                instance,
                nearestMountedAncestor,
                sourceFiber
              ),
              markRootUpdated(instance, 2),
              ensureRootIsScheduled(instance));
            break;
          }
        }
        nearestMountedAncestor = nearestMountedAncestor.return;
      }
  }
  function attachPingListener(root, wakeable, lanes) {
    var pingCache = root.pingCache;
    if (null === pingCache) {
      pingCache = root.pingCache = new PossiblyWeakMap();
      var threadIDs = new Set();
      pingCache.set(wakeable, threadIDs);
    } else
      (threadIDs = pingCache.get(wakeable)),
        void 0 === threadIDs &&
          ((threadIDs = new Set()), pingCache.set(wakeable, threadIDs));
    threadIDs.has(lanes) ||
      ((workInProgressRootDidAttachPingListener = !0),
      threadIDs.add(lanes),
      (pingCache = pingSuspendedRoot.bind(null, root, wakeable, lanes)),
      isDevToolsPresent && restorePendingUpdaters(root, lanes),
      wakeable.then(pingCache, pingCache));
  }
  function pingSuspendedRoot(root, wakeable, pingedLanes) {
    var pingCache = root.pingCache;
    null !== pingCache && pingCache.delete(wakeable);
    root.pingedLanes |= root.suspendedLanes & pingedLanes;
    executionContext & 2
      ? (workInProgressRootDidIncludeRecursiveRenderUpdate = !0)
      : executionContext & 4 && (didIncludeCommitPhaseUpdate = !0);
    throwIfInfiniteUpdateLoopDetected();
    workInProgressRoot === root &&
      (workInProgressRootRenderLanes & pingedLanes) === pingedLanes &&
      (4 === workInProgressRootExitStatus ||
      (3 === workInProgressRootExitStatus &&
        (workInProgressRootRenderLanes & 62914560) ===
          workInProgressRootRenderLanes &&
        300 > now$1() - globalMostRecentFallbackTime)
        ? 0 === (executionContext & 2) && prepareFreshStack(root, 0)
        : (workInProgressRootPingedLanes |= pingedLanes));
    ensureRootIsScheduled(root);
  }
  function retryTimedOutBoundary(boundaryFiber, retryLane) {
    0 === retryLane && (retryLane = claimNextRetryLane());
    boundaryFiber = enqueueConcurrentRenderForLane(boundaryFiber, retryLane);
    null !== boundaryFiber &&
      (markRootUpdated(boundaryFiber, retryLane),
      ensureRootIsScheduled(boundaryFiber));
  }
  function retryDehydratedSuspenseBoundary(boundaryFiber) {
    var suspenseState = boundaryFiber.memoizedState,
      retryLane = 0;
    null !== suspenseState && (retryLane = suspenseState.retryLane);
    retryTimedOutBoundary(boundaryFiber, retryLane);
  }
  function resolveRetryWakeable(boundaryFiber, wakeable) {
    var retryLane = 0;
    switch (boundaryFiber.tag) {
      case 13:
        var retryCache = boundaryFiber.stateNode;
        var suspenseState = boundaryFiber.memoizedState;
        null !== suspenseState && (retryLane = suspenseState.retryLane);
        break;
      case 19:
        retryCache = boundaryFiber.stateNode;
        break;
      case 22:
        retryCache = boundaryFiber.stateNode._retryCache;
        break;
      default:
        throw Error(formatProdErrorMessage(314));
    }
    null !== retryCache && retryCache.delete(wakeable);
    retryTimedOutBoundary(boundaryFiber, retryLane);
  }
  function throwIfInfiniteUpdateLoopDetected() {
    if (50 < nestedUpdateCount)
      throw (
        ((nestedUpdateCount = 0),
        (rootWithNestedUpdates = null),
        executionContext & 2 &&
          null !== workInProgressRoot &&
          (workInProgressRoot.errorRecoveryDisabledLanes |=
            workInProgressRootRenderLanes),
        Error(formatProdErrorMessage(185)))
      );
  }
  function restorePendingUpdaters(root, lanes) {
    isDevToolsPresent &&
      root.memoizedUpdaters.forEach(function (schedulingFiber) {
        addFiberToLanesMap(root, schedulingFiber, lanes);
      });
  }
  function scheduleCallback(priorityLevel, callback) {
    return scheduleCallback$3(priorityLevel, callback);
  }
  function FiberNode(tag, pendingProps, key, mode) {
    this.tag = tag;
    this.key = key;
    this.sibling =
      this.child =
      this.return =
      this.stateNode =
      this.type =
      this.elementType =
        null;
    this.index = 0;
    this.refCleanup = this.ref = null;
    this.pendingProps = pendingProps;
    this.dependencies =
      this.memoizedState =
      this.updateQueue =
      this.memoizedProps =
        null;
    this.mode = mode;
    this.subtreeFlags = this.flags = 0;
    this.deletions = null;
    this.childLanes = this.lanes = 0;
    this.alternate = null;
    this.actualDuration = 0;
    this.actualStartTime = -1;
    this.treeBaseDuration = this.selfBaseDuration = 0;
  }
  function shouldConstruct(Component) {
    Component = Component.prototype;
    return !(!Component || !Component.isReactComponent);
  }
  function createWorkInProgress(current, pendingProps) {
    var workInProgress = current.alternate;
    null === workInProgress
      ? ((workInProgress = createFiber(
          current.tag,
          pendingProps,
          current.key,
          current.mode
        )),
        (workInProgress.elementType = current.elementType),
        (workInProgress.type = current.type),
        (workInProgress.stateNode = current.stateNode),
        (workInProgress.alternate = current),
        (current.alternate = workInProgress))
      : ((workInProgress.pendingProps = pendingProps),
        (workInProgress.type = current.type),
        (workInProgress.flags = 0),
        (workInProgress.subtreeFlags = 0),
        (workInProgress.deletions = null),
        (workInProgress.actualDuration = 0),
        (workInProgress.actualStartTime = -1));
    workInProgress.flags = current.flags & 31457280;
    workInProgress.childLanes = current.childLanes;
    workInProgress.lanes = current.lanes;
    workInProgress.child = current.child;
    workInProgress.memoizedProps = current.memoizedProps;
    workInProgress.memoizedState = current.memoizedState;
    workInProgress.updateQueue = current.updateQueue;
    pendingProps = current.dependencies;
    workInProgress.dependencies =
      null === pendingProps
        ? null
        : {
            lanes: pendingProps.lanes,
            firstContext: pendingProps.firstContext
          };
    workInProgress.sibling = current.sibling;
    workInProgress.index = current.index;
    workInProgress.ref = current.ref;
    workInProgress.refCleanup = current.refCleanup;
    workInProgress.selfBaseDuration = current.selfBaseDuration;
    workInProgress.treeBaseDuration = current.treeBaseDuration;
    return workInProgress;
  }
  function resetWorkInProgress(workInProgress, renderLanes) {
    workInProgress.flags &= 31457282;
    var current = workInProgress.alternate;
    null === current
      ? ((workInProgress.childLanes = 0),
        (workInProgress.lanes = renderLanes),
        (workInProgress.child = null),
        (workInProgress.subtreeFlags = 0),
        (workInProgress.memoizedProps = null),
        (workInProgress.memoizedState = null),
        (workInProgress.updateQueue = null),
        (workInProgress.dependencies = null),
        (workInProgress.stateNode = null),
        (workInProgress.selfBaseDuration = 0),
        (workInProgress.treeBaseDuration = 0))
      : ((workInProgress.childLanes = current.childLanes),
        (workInProgress.lanes = current.lanes),
        (workInProgress.child = current.child),
        (workInProgress.subtreeFlags = 0),
        (workInProgress.deletions = null),
        (workInProgress.memoizedProps = current.memoizedProps),
        (workInProgress.memoizedState = current.memoizedState),
        (workInProgress.updateQueue = current.updateQueue),
        (workInProgress.type = current.type),
        (renderLanes = current.dependencies),
        (workInProgress.dependencies =
          null === renderLanes
            ? null
            : {
                lanes: renderLanes.lanes,
                firstContext: renderLanes.firstContext
              }),
        (workInProgress.selfBaseDuration = current.selfBaseDuration),
        (workInProgress.treeBaseDuration = current.treeBaseDuration));
    return workInProgress;
  }
  function createFiberFromTypeAndProps(
    type,
    key,
    pendingProps,
    owner,
    mode,
    lanes
  ) {
    var fiberTag = 0;
    owner = type;
    if ("function" === typeof type) shouldConstruct(type) && (fiberTag = 1);
    else if ("string" === typeof type)
      fiberTag =
        supportsResources && supportsSingletons
          ? isHostHoistableType(type, pendingProps, contextStackCursor.current)
            ? 26
            : isHostSingletonType(type)
            ? 27
            : 5
          : supportsResources
          ? isHostHoistableType(type, pendingProps, contextStackCursor.current)
            ? 26
            : 5
          : supportsSingletons
          ? isHostSingletonType(type)
            ? 27
            : 5
          : 5;
    else
      a: switch (type) {
        case REACT_FRAGMENT_TYPE:
          return createFiberFromFragment(
            pendingProps.children,
            mode,
            lanes,
            key
          );
        case REACT_STRICT_MODE_TYPE:
          fiberTag = 8;
          mode |= 24;
          break;
        case REACT_PROFILER_TYPE:
          return (
            (type = createFiber(12, pendingProps, key, mode | 2)),
            (type.elementType = REACT_PROFILER_TYPE),
            (type.lanes = lanes),
            (type.stateNode = { effectDuration: 0, passiveEffectDuration: 0 }),
            type
          );
        case REACT_SUSPENSE_TYPE:
          return (
            (type = createFiber(13, pendingProps, key, mode)),
            (type.elementType = REACT_SUSPENSE_TYPE),
            (type.lanes = lanes),
            type
          );
        case REACT_SUSPENSE_LIST_TYPE:
          return (
            (type = createFiber(19, pendingProps, key, mode)),
            (type.elementType = REACT_SUSPENSE_LIST_TYPE),
            (type.lanes = lanes),
            type
          );
        case REACT_OFFSCREEN_TYPE:
          return createFiberFromOffscreen(pendingProps, mode, lanes, key);
        default:
          if ("object" === typeof type && null !== type)
            switch (type.$$typeof) {
              case REACT_PROVIDER_TYPE:
              case REACT_CONTEXT_TYPE:
                fiberTag = 10;
                break a;
              case REACT_CONSUMER_TYPE:
                fiberTag = 9;
                break a;
              case REACT_FORWARD_REF_TYPE:
                fiberTag = 11;
                break a;
              case REACT_MEMO_TYPE:
                fiberTag = 14;
                break a;
              case REACT_LAZY_TYPE:
                fiberTag = 16;
                owner = null;
                break a;
            }
          fiberTag = 29;
          pendingProps = Error(
            formatProdErrorMessage(
              130,
              null === type ? "null" : typeof type,
              ""
            )
          );
          owner = null;
      }
    key = createFiber(fiberTag, pendingProps, key, mode);
    key.elementType = type;
    key.type = owner;
    key.lanes = lanes;
    return key;
  }
  function createFiberFromFragment(elements, mode, lanes, key) {
    elements = createFiber(7, elements, key, mode);
    elements.lanes = lanes;
    return elements;
  }
  function createFiberFromOffscreen(pendingProps, mode, lanes, key) {
    pendingProps = createFiber(22, pendingProps, key, mode);
    pendingProps.elementType = REACT_OFFSCREEN_TYPE;
    pendingProps.lanes = lanes;
    var primaryChildInstance = {
      _visibility: 1,
      _pendingVisibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null,
      _current: null,
      detach: function () {
        var fiber = primaryChildInstance._current;
        if (null === fiber) throw Error(formatProdErrorMessage(456));
        if (0 === (primaryChildInstance._pendingVisibility & 2)) {
          var root = enqueueConcurrentRenderForLane(fiber, 2);
          null !== root &&
            ((primaryChildInstance._pendingVisibility |= 2),
            scheduleUpdateOnFiber(root, fiber, 2));
        }
      },
      attach: function () {
        var fiber = primaryChildInstance._current;
        if (null === fiber) throw Error(formatProdErrorMessage(456));
        if (0 !== (primaryChildInstance._pendingVisibility & 2)) {
          var root = enqueueConcurrentRenderForLane(fiber, 2);
          null !== root &&
            ((primaryChildInstance._pendingVisibility &= -3),
            scheduleUpdateOnFiber(root, fiber, 2));
        }
      }
    };
    pendingProps.stateNode = primaryChildInstance;
    return pendingProps;
  }
  function createFiberFromText(content, mode, lanes) {
    content = createFiber(6, content, null, mode);
    content.lanes = lanes;
    return content;
  }
  function createFiberFromPortal(portal, mode, lanes) {
    mode = createFiber(
      4,
      null !== portal.children ? portal.children : [],
      portal.key,
      mode
    );
    mode.lanes = lanes;
    mode.stateNode = {
      containerInfo: portal.containerInfo,
      pendingChildren: null,
      implementation: portal.implementation
    };
    return mode;
  }
  function FiberRootNode(
    containerInfo,
    tag,
    hydrate,
    identifierPrefix,
    onUncaughtError,
    onCaughtError,
    onRecoverableError,
    formState
  ) {
    this.tag = 1;
    this.containerInfo = containerInfo;
    this.finishedWork =
      this.pingCache =
      this.current =
      this.pendingChildren =
        null;
    this.timeoutHandle = noTimeout;
    this.callbackNode =
      this.next =
      this.pendingContext =
      this.context =
      this.cancelPendingCommit =
        null;
    this.callbackPriority = 0;
    this.expirationTimes = createLaneMap(-1);
    this.entangledLanes =
      this.shellSuspendCounter =
      this.errorRecoveryDisabledLanes =
      this.finishedLanes =
      this.expiredLanes =
      this.pingedLanes =
      this.suspendedLanes =
      this.pendingLanes =
        0;
    this.entanglements = createLaneMap(0);
    this.hiddenUpdates = createLaneMap(null);
    this.identifierPrefix = identifierPrefix;
    this.onUncaughtError = onUncaughtError;
    this.onCaughtError = onCaughtError;
    this.onRecoverableError = onRecoverableError;
    this.pooledCache = null;
    this.pooledCacheLanes = 0;
    this.formState = formState;
    this.incompleteTransitions = new Map();
    this.passiveEffectDuration = this.effectDuration = 0;
    this.memoizedUpdaters = new Set();
    containerInfo = this.pendingUpdatersLaneMap = [];
    for (tag = 0; 31 > tag; tag++) containerInfo.push(new Set());
  }
  function createFiberRoot(
    containerInfo,
    tag,
    hydrate,
    initialChildren,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onUncaughtError,
    onCaughtError,
    onRecoverableError,
    transitionCallbacks,
    formState
  ) {
    containerInfo = new FiberRootNode(
      containerInfo,
      tag,
      hydrate,
      identifierPrefix,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      formState
    );
    tag = 1;
    !0 === isStrictMode && (tag |= 24);
    isDevToolsPresent && (tag |= 2);
    isStrictMode = createFiber(3, null, null, tag);
    containerInfo.current = isStrictMode;
    isStrictMode.stateNode = containerInfo;
    tag = createCache();
    tag.refCount++;
    containerInfo.pooledCache = tag;
    tag.refCount++;
    isStrictMode.memoizedState = {
      element: initialChildren,
      isDehydrated: hydrate,
      cache: tag
    };
    initializeUpdateQueue(isStrictMode);
    return containerInfo;
  }
  function getContextForSubtree(parentComponent) {
    if (!parentComponent) return emptyContextObject;
    parentComponent = emptyContextObject;
    return parentComponent;
  }
  function findHostInstance(component) {
    var fiber = component._reactInternals;
    if (void 0 === fiber) {
      if ("function" === typeof component.render)
        throw Error(formatProdErrorMessage(188));
      component = Object.keys(component).join(",");
      throw Error(formatProdErrorMessage(268, component));
    }
    component = findCurrentHostFiber(fiber);
    return null === component ? null : getPublicInstance(component.stateNode);
  }
  function updateContainerImpl(
    rootFiber,
    lane,
    element,
    container,
    parentComponent,
    callback
  ) {
    null !== injectedProfilingHooks &&
      "function" === typeof injectedProfilingHooks.markRenderScheduled &&
      injectedProfilingHooks.markRenderScheduled(lane);
    parentComponent = getContextForSubtree(parentComponent);
    null === container.context
      ? (container.context = parentComponent)
      : (container.pendingContext = parentComponent);
    container = createUpdate(lane);
    container.payload = { element: element };
    callback = void 0 === callback ? null : callback;
    null !== callback && (container.callback = callback);
    element = enqueueUpdate(rootFiber, container, lane);
    null !== element &&
      (scheduleUpdateOnFiber(element, rootFiber, lane),
      entangleTransitions(element, rootFiber, lane));
  }
  function markRetryLaneImpl(fiber, retryLane) {
    fiber = fiber.memoizedState;
    if (null !== fiber && null !== fiber.dehydrated) {
      var a = fiber.retryLane;
      fiber.retryLane = 0 !== a && a < retryLane ? a : retryLane;
    }
  }
  function markRetryLaneIfNotHydrated(fiber, retryLane) {
    markRetryLaneImpl(fiber, retryLane);
    (fiber = fiber.alternate) && markRetryLaneImpl(fiber, retryLane);
  }
  function findHostInstanceByFiber(fiber) {
    fiber = findCurrentHostFiber(fiber);
    return null === fiber ? null : fiber.stateNode;
  }
  function emptyFindFiberByHostInstance() {
    return null;
  }
  var exports = {};
  ("use strict");
  var React = require("react"),
    Scheduler = require("scheduler"),
    assign = Object.assign,
    REACT_LEGACY_ELEMENT_TYPE = Symbol.for("react.element"),
    REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
    REACT_PORTAL_TYPE = Symbol.for("react.portal"),
    REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
    REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"),
    REACT_PROFILER_TYPE = Symbol.for("react.profiler"),
    REACT_PROVIDER_TYPE = Symbol.for("react.provider"),
    REACT_CONSUMER_TYPE = Symbol.for("react.consumer"),
    REACT_CONTEXT_TYPE = Symbol.for("react.context"),
    REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
    REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
    REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"),
    REACT_MEMO_TYPE = Symbol.for("react.memo"),
    REACT_LAZY_TYPE = Symbol.for("react.lazy");
  Symbol.for("react.scope");
  Symbol.for("react.debug_trace_mode");
  var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
  Symbol.for("react.legacy_hidden");
  Symbol.for("react.tracing_marker");
  var REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel"),
    MAYBE_ITERATOR_SYMBOL = Symbol.iterator,
    REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"),
    ReactSharedInternals =
      React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
    prefix,
    suffix,
    reentry = !1,
    isArrayImpl = Array.isArray,
    getPublicInstance = $$$config.getPublicInstance,
    getRootHostContext = $$$config.getRootHostContext,
    getChildHostContext = $$$config.getChildHostContext,
    prepareForCommit = $$$config.prepareForCommit,
    resetAfterCommit = $$$config.resetAfterCommit,
    createInstance = $$$config.createInstance,
    appendInitialChild = $$$config.appendInitialChild,
    finalizeInitialChildren = $$$config.finalizeInitialChildren,
    shouldSetTextContent = $$$config.shouldSetTextContent,
    createTextInstance = $$$config.createTextInstance,
    scheduleTimeout = $$$config.scheduleTimeout,
    cancelTimeout = $$$config.cancelTimeout,
    noTimeout = $$$config.noTimeout,
    isPrimaryRenderer = $$$config.isPrimaryRenderer;
  $$$config.warnsIfNotActing;
  var supportsMutation = $$$config.supportsMutation,
    supportsPersistence = $$$config.supportsPersistence,
    supportsHydration = $$$config.supportsHydration,
    getInstanceFromNode = $$$config.getInstanceFromNode;
  $$$config.beforeActiveInstanceBlur;
  $$$config.afterActiveInstanceBlur;
  var preparePortalMount = $$$config.preparePortalMount;
  $$$config.prepareScopeUpdate;
  $$$config.getInstanceFromScope;
  var setCurrentUpdatePriority = $$$config.setCurrentUpdatePriority,
    getCurrentUpdatePriority = $$$config.getCurrentUpdatePriority,
    resolveUpdatePriority = $$$config.resolveUpdatePriority,
    shouldAttemptEagerTransition = $$$config.shouldAttemptEagerTransition,
    detachDeletedInstance = $$$config.detachDeletedInstance;
  $$$config.requestPostPaintCallback;
  var maySuspendCommit = $$$config.maySuspendCommit,
    preloadInstance = $$$config.preloadInstance,
    startSuspendingCommit = $$$config.startSuspendingCommit,
    suspendInstance = $$$config.suspendInstance,
    waitForCommitToBeReady = $$$config.waitForCommitToBeReady,
    NotPendingTransition = $$$config.NotPendingTransition,
    resetFormInstance = $$$config.resetFormInstance;
  $$$config.printToConsole;
  var supportsMicrotasks = $$$config.supportsMicrotasks,
    scheduleMicrotask = $$$config.scheduleMicrotask,
    supportsTestSelectors = $$$config.supportsTestSelectors,
    findFiberRoot = $$$config.findFiberRoot,
    getBoundingRect = $$$config.getBoundingRect,
    getTextContent = $$$config.getTextContent,
    isHiddenSubtree = $$$config.isHiddenSubtree,
    matchAccessibilityRole = $$$config.matchAccessibilityRole,
    setFocusIfFocusable = $$$config.setFocusIfFocusable,
    setupIntersectionObserver = $$$config.setupIntersectionObserver,
    appendChild = $$$config.appendChild,
    appendChildToContainer = $$$config.appendChildToContainer,
    commitTextUpdate = $$$config.commitTextUpdate,
    commitMount = $$$config.commitMount,
    commitUpdate = $$$config.commitUpdate,
    insertBefore = $$$config.insertBefore,
    insertInContainerBefore = $$$config.insertInContainerBefore,
    removeChild = $$$config.removeChild,
    removeChildFromContainer = $$$config.removeChildFromContainer,
    resetTextContent = $$$config.resetTextContent,
    hideInstance = $$$config.hideInstance,
    hideTextInstance = $$$config.hideTextInstance,
    unhideInstance = $$$config.unhideInstance,
    unhideTextInstance = $$$config.unhideTextInstance,
    clearContainer = $$$config.clearContainer,
    cloneInstance = $$$config.cloneInstance,
    createContainerChildSet = $$$config.createContainerChildSet,
    appendChildToContainerChildSet = $$$config.appendChildToContainerChildSet,
    finalizeContainerChildren = $$$config.finalizeContainerChildren,
    replaceContainerChildren = $$$config.replaceContainerChildren,
    cloneHiddenInstance = $$$config.cloneHiddenInstance,
    cloneHiddenTextInstance = $$$config.cloneHiddenTextInstance,
    isSuspenseInstancePending = $$$config.isSuspenseInstancePending,
    isSuspenseInstanceFallback = $$$config.isSuspenseInstanceFallback,
    getSuspenseInstanceFallbackErrorDetails =
      $$$config.getSuspenseInstanceFallbackErrorDetails,
    registerSuspenseInstanceRetry = $$$config.registerSuspenseInstanceRetry,
    canHydrateFormStateMarker = $$$config.canHydrateFormStateMarker,
    isFormStateMarkerMatching = $$$config.isFormStateMarkerMatching,
    getNextHydratableSibling = $$$config.getNextHydratableSibling,
    getFirstHydratableChild = $$$config.getFirstHydratableChild,
    getFirstHydratableChildWithinContainer =
      $$$config.getFirstHydratableChildWithinContainer,
    getFirstHydratableChildWithinSuspenseInstance =
      $$$config.getFirstHydratableChildWithinSuspenseInstance,
    canHydrateInstance = $$$config.canHydrateInstance,
    canHydrateTextInstance = $$$config.canHydrateTextInstance,
    canHydrateSuspenseInstance = $$$config.canHydrateSuspenseInstance,
    hydrateInstance = $$$config.hydrateInstance,
    hydrateTextInstance = $$$config.hydrateTextInstance,
    hydrateSuspenseInstance = $$$config.hydrateSuspenseInstance,
    getNextHydratableInstanceAfterSuspenseInstance =
      $$$config.getNextHydratableInstanceAfterSuspenseInstance,
    commitHydratedContainer = $$$config.commitHydratedContainer,
    commitHydratedSuspenseInstance = $$$config.commitHydratedSuspenseInstance,
    clearSuspenseBoundary = $$$config.clearSuspenseBoundary,
    clearSuspenseBoundaryFromContainer =
      $$$config.clearSuspenseBoundaryFromContainer,
    shouldDeleteUnhydratedTailInstances =
      $$$config.shouldDeleteUnhydratedTailInstances;
  $$$config.diffHydratedPropsForDevWarnings;
  $$$config.diffHydratedTextForDevWarnings;
  $$$config.describeHydratableInstanceForDevWarnings;
  var validateHydratableInstance = $$$config.validateHydratableInstance,
    validateHydratableTextInstance = $$$config.validateHydratableTextInstance,
    supportsResources = $$$config.supportsResources,
    isHostHoistableType = $$$config.isHostHoistableType,
    getHoistableRoot = $$$config.getHoistableRoot,
    getResource = $$$config.getResource,
    acquireResource = $$$config.acquireResource,
    releaseResource = $$$config.releaseResource,
    hydrateHoistable = $$$config.hydrateHoistable,
    mountHoistable = $$$config.mountHoistable,
    unmountHoistable = $$$config.unmountHoistable,
    createHoistableInstance = $$$config.createHoistableInstance,
    prepareToCommitHoistables = $$$config.prepareToCommitHoistables,
    mayResourceSuspendCommit = $$$config.mayResourceSuspendCommit,
    preloadResource = $$$config.preloadResource,
    suspendResource = $$$config.suspendResource,
    supportsSingletons = $$$config.supportsSingletons,
    resolveSingletonInstance = $$$config.resolveSingletonInstance,
    clearSingleton = $$$config.clearSingleton,
    acquireSingletonInstance = $$$config.acquireSingletonInstance,
    releaseSingletonInstance = $$$config.releaseSingletonInstance,
    isHostSingletonType = $$$config.isHostSingletonType,
    valueStack = [],
    index$jscomp$0 = -1,
    emptyContextObject = {},
    clz32 = Math.clz32 ? Math.clz32 : clz32Fallback,
    log$1 = Math.log,
    LN2 = Math.LN2,
    nextTransitionLane = 128,
    nextRetryLane = 4194304,
    scheduleCallback$3 = Scheduler.unstable_scheduleCallback,
    cancelCallback$1 = Scheduler.unstable_cancelCallback,
    shouldYield = Scheduler.unstable_shouldYield,
    requestPaint = Scheduler.unstable_requestPaint,
    now$1 = Scheduler.unstable_now,
    ImmediatePriority = Scheduler.unstable_ImmediatePriority,
    UserBlockingPriority = Scheduler.unstable_UserBlockingPriority,
    NormalPriority$1 = Scheduler.unstable_NormalPriority,
    IdlePriority = Scheduler.unstable_IdlePriority,
    log = Scheduler.log,
    unstable_setDisableYieldValue = Scheduler.unstable_setDisableYieldValue,
    rendererID = null,
    injectedHook = null,
    injectedProfilingHooks = null,
    isDevToolsPresent = "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__,
    objectIs = "function" === typeof Object.is ? Object.is : is,
    CapturedStacks = new WeakMap(),
    forkStack = [],
    forkStackIndex = 0,
    treeForkProvider = null,
    treeForkCount = 0,
    idStack = [],
    idStackIndex = 0,
    treeContextProvider = null,
    treeContextId = 1,
    treeContextOverflow = "",
    contextStackCursor = createCursor(null),
    contextFiberStackCursor = createCursor(null),
    rootInstanceStackCursor = createCursor(null),
    hostTransitionProviderCursor = createCursor(null),
    HostTransitionContext = {
      $$typeof: REACT_CONTEXT_TYPE,
      Provider: null,
      Consumer: null,
      _currentValue: null,
      _currentValue2: null,
      _threadCount: 0
    },
    hydrationParentFiber = null,
    nextHydratableInstance = null,
    isHydrating = !1,
    hydrationErrors = null,
    rootOrSingletonContext = !1,
    HydrationMismatchException = Error(formatProdErrorMessage(519)),
    concurrentQueues = [],
    concurrentQueuesIndex = 0,
    concurrentlyUpdatedLanes = 0,
    firstScheduledRoot = null,
    lastScheduledRoot = null,
    didScheduleMicrotask = !1,
    mightHavePendingSyncWork = !1,
    isFlushingWork = !1,
    currentEventTransitionLane = 0,
    currentEntangledListeners = null,
    currentEntangledPendingCount = 0,
    currentEntangledLane = 0,
    currentEntangledActionThenable = null,
    hasForceUpdate = !1,
    didReadFromEntangledAsyncAction = !1,
    hasOwnProperty = Object.prototype.hasOwnProperty,
    SuspenseException = Error(formatProdErrorMessage(460)),
    SuspenseyCommitException = Error(formatProdErrorMessage(474)),
    noopSuspenseyCommitThenable = { then: function () {} },
    suspendedThenable = null,
    thenableState$1 = null,
    thenableIndexCounter$1 = 0,
    reconcileChildFibers = createChildReconciler(!0),
    mountChildFibers = createChildReconciler(!1),
    currentTreeHiddenStackCursor = createCursor(null),
    prevEntangledRenderLanesCursor = createCursor(0),
    suspenseHandlerStackCursor = createCursor(null),
    shellBoundary = null,
    suspenseStackCursor = createCursor(0),
    renderLanes = 0,
    currentlyRenderingFiber$1 = null,
    currentHook = null,
    workInProgressHook = null,
    didScheduleRenderPhaseUpdate = !1,
    didScheduleRenderPhaseUpdateDuringThisPass = !1,
    shouldDoubleInvokeUserFnsInHooksDEV = !1,
    localIdCounter = 0,
    thenableIndexCounter = 0,
    thenableState = null,
    globalClientIdCounter = 0;
  var createFunctionComponentUpdateQueue = function () {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  };
  var ContextOnlyDispatcher = {
    readContext: readContext,
    use: use,
    useCallback: throwInvalidHookError,
    useContext: throwInvalidHookError,
    useEffect: throwInvalidHookError,
    useImperativeHandle: throwInvalidHookError,
    useLayoutEffect: throwInvalidHookError,
    useInsertionEffect: throwInvalidHookError,
    useMemo: throwInvalidHookError,
    useReducer: throwInvalidHookError,
    useRef: throwInvalidHookError,
    useState: throwInvalidHookError,
    useDebugValue: throwInvalidHookError,
    useDeferredValue: throwInvalidHookError,
    useTransition: throwInvalidHookError,
    useSyncExternalStore: throwInvalidHookError,
    useId: throwInvalidHookError
  };
  ContextOnlyDispatcher.useCacheRefresh = throwInvalidHookError;
  ContextOnlyDispatcher.useMemoCache = throwInvalidHookError;
  ContextOnlyDispatcher.useHostTransitionStatus = throwInvalidHookError;
  ContextOnlyDispatcher.useFormState = throwInvalidHookError;
  ContextOnlyDispatcher.useActionState = throwInvalidHookError;
  ContextOnlyDispatcher.useOptimistic = throwInvalidHookError;
  var HooksDispatcherOnMount = {
    readContext: readContext,
    use: use,
    useCallback: function (callback, deps) {
      mountWorkInProgressHook().memoizedState = [
        callback,
        void 0 === deps ? null : deps
      ];
      return callback;
    },
    useContext: readContext,
    useEffect: mountEffect,
    useImperativeHandle: function (ref, create, deps) {
      deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
      mountEffectImpl(
        4194308,
        4,
        imperativeHandleEffect.bind(null, create, ref),
        deps
      );
    },
    useLayoutEffect: function (create, deps) {
      return mountEffectImpl(4194308, 4, create, deps);
    },
    useInsertionEffect: function (create, deps) {
      mountEffectImpl(4, 2, create, deps);
    },
    useMemo: function (nextCreate, deps) {
      var hook = mountWorkInProgressHook();
      deps = void 0 === deps ? null : deps;
      var nextValue = nextCreate();
      shouldDoubleInvokeUserFnsInHooksDEV &&
        (setIsStrictModeForDevtools(!0),
        nextCreate(),
        setIsStrictModeForDevtools(!1));
      hook.memoizedState = [nextValue, deps];
      return nextValue;
    },
    useReducer: function (reducer, initialArg, init) {
      var hook = mountWorkInProgressHook();
      if (void 0 !== init) {
        var initialState = init(initialArg);
        shouldDoubleInvokeUserFnsInHooksDEV &&
          (setIsStrictModeForDevtools(!0),
          init(initialArg),
          setIsStrictModeForDevtools(!1));
      } else initialState = initialArg;
      hook.memoizedState = hook.baseState = initialState;
      reducer = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: reducer,
        lastRenderedState: initialState
      };
      hook.queue = reducer;
      reducer = reducer.dispatch = dispatchReducerAction.bind(
        null,
        currentlyRenderingFiber$1,
        reducer
      );
      return [hook.memoizedState, reducer];
    },
    useRef: function (initialValue) {
      var hook = mountWorkInProgressHook();
      initialValue = { current: initialValue };
      return (hook.memoizedState = initialValue);
    },
    useState: function (initialState) {
      initialState = mountStateImpl(initialState);
      var queue = initialState.queue,
        dispatch = dispatchSetState.bind(
          null,
          currentlyRenderingFiber$1,
          queue
        );
      queue.dispatch = dispatch;
      return [initialState.memoizedState, dispatch];
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function (value, initialValue) {
      var hook = mountWorkInProgressHook();
      return mountDeferredValueImpl(hook, value, initialValue);
    },
    useTransition: function () {
      var stateHook = mountStateImpl(!1);
      stateHook = startTransition.bind(
        null,
        currentlyRenderingFiber$1,
        stateHook.queue,
        !0,
        !1
      );
      mountWorkInProgressHook().memoizedState = stateHook;
      return [!1, stateHook];
    },
    useSyncExternalStore: function (subscribe, getSnapshot, getServerSnapshot) {
      var fiber = currentlyRenderingFiber$1,
        hook = mountWorkInProgressHook();
      if (isHydrating) {
        if (void 0 === getServerSnapshot)
          throw Error(formatProdErrorMessage(407));
        getServerSnapshot = getServerSnapshot();
      } else {
        getServerSnapshot = getSnapshot();
        if (null === workInProgressRoot)
          throw Error(formatProdErrorMessage(349));
        0 !== (workInProgressRootRenderLanes & 60) ||
          pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
      }
      hook.memoizedState = getServerSnapshot;
      var inst = { value: getServerSnapshot, getSnapshot: getSnapshot };
      hook.queue = inst;
      mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [
        subscribe
      ]);
      fiber.flags |= 2048;
      pushEffect(
        9,
        updateStoreInstance.bind(
          null,
          fiber,
          inst,
          getServerSnapshot,
          getSnapshot
        ),
        { destroy: void 0 },
        null
      );
      return getServerSnapshot;
    },
    useId: function () {
      var hook = mountWorkInProgressHook(),
        identifierPrefix = workInProgressRoot.identifierPrefix;
      if (isHydrating) {
        var JSCompiler_inline_result = treeContextOverflow;
        var idWithLeadingBit = treeContextId;
        JSCompiler_inline_result =
          (
            idWithLeadingBit & ~(1 << (32 - clz32(idWithLeadingBit) - 1))
          ).toString(32) + JSCompiler_inline_result;
        identifierPrefix =
          ":" + identifierPrefix + "R" + JSCompiler_inline_result;
        JSCompiler_inline_result = localIdCounter++;
        0 < JSCompiler_inline_result &&
          (identifierPrefix += "H" + JSCompiler_inline_result.toString(32));
        identifierPrefix += ":";
      } else
        (JSCompiler_inline_result = globalClientIdCounter++),
          (identifierPrefix =
            ":" +
            identifierPrefix +
            "r" +
            JSCompiler_inline_result.toString(32) +
            ":");
      return (hook.memoizedState = identifierPrefix);
    },
    useCacheRefresh: function () {
      return (mountWorkInProgressHook().memoizedState = refreshCache.bind(
        null,
        currentlyRenderingFiber$1
      ));
    }
  };
  HooksDispatcherOnMount.useMemoCache = useMemoCache;
  HooksDispatcherOnMount.useHostTransitionStatus = useHostTransitionStatus;
  HooksDispatcherOnMount.useFormState = mountActionState;
  HooksDispatcherOnMount.useActionState = mountActionState;
  HooksDispatcherOnMount.useOptimistic = function (passthrough) {
    var hook = mountWorkInProgressHook();
    hook.memoizedState = hook.baseState = passthrough;
    var queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: null,
      lastRenderedState: null
    };
    hook.queue = queue;
    hook = dispatchOptimisticSetState.bind(
      null,
      currentlyRenderingFiber$1,
      !0,
      queue
    );
    queue.dispatch = hook;
    return [passthrough, hook];
  };
  var HooksDispatcherOnUpdate = {
    readContext: readContext,
    use: use,
    useCallback: updateCallback,
    useContext: readContext,
    useEffect: updateEffect,
    useImperativeHandle: updateImperativeHandle,
    useInsertionEffect: updateInsertionEffect,
    useLayoutEffect: updateLayoutEffect,
    useMemo: updateMemo,
    useReducer: updateReducer,
    useRef: updateRef,
    useState: function () {
      return updateReducer(basicStateReducer);
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function (value, initialValue) {
      var hook = updateWorkInProgressHook();
      return updateDeferredValueImpl(
        hook,
        currentHook.memoizedState,
        value,
        initialValue
      );
    },
    useTransition: function () {
      var booleanOrThenable = updateReducer(basicStateReducer)[0],
        start = updateWorkInProgressHook().memoizedState;
      return [
        "boolean" === typeof booleanOrThenable
          ? booleanOrThenable
          : useThenable(booleanOrThenable),
        start
      ];
    },
    useSyncExternalStore: updateSyncExternalStore,
    useId: updateId
  };
  HooksDispatcherOnUpdate.useCacheRefresh = updateRefresh;
  HooksDispatcherOnUpdate.useMemoCache = useMemoCache;
  HooksDispatcherOnUpdate.useHostTransitionStatus = useHostTransitionStatus;
  HooksDispatcherOnUpdate.useFormState = updateActionState;
  HooksDispatcherOnUpdate.useActionState = updateActionState;
  HooksDispatcherOnUpdate.useOptimistic = function (passthrough, reducer) {
    var hook = updateWorkInProgressHook();
    return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
  };
  var HooksDispatcherOnRerender = {
    readContext: readContext,
    use: use,
    useCallback: updateCallback,
    useContext: readContext,
    useEffect: updateEffect,
    useImperativeHandle: updateImperativeHandle,
    useInsertionEffect: updateInsertionEffect,
    useLayoutEffect: updateLayoutEffect,
    useMemo: updateMemo,
    useReducer: rerenderReducer,
    useRef: updateRef,
    useState: function () {
      return rerenderReducer(basicStateReducer);
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function (value, initialValue) {
      var hook = updateWorkInProgressHook();
      return null === currentHook
        ? mountDeferredValueImpl(hook, value, initialValue)
        : updateDeferredValueImpl(
            hook,
            currentHook.memoizedState,
            value,
            initialValue
          );
    },
    useTransition: function () {
      var booleanOrThenable = rerenderReducer(basicStateReducer)[0],
        start = updateWorkInProgressHook().memoizedState;
      return [
        "boolean" === typeof booleanOrThenable
          ? booleanOrThenable
          : useThenable(booleanOrThenable),
        start
      ];
    },
    useSyncExternalStore: updateSyncExternalStore,
    useId: updateId
  };
  HooksDispatcherOnRerender.useCacheRefresh = updateRefresh;
  HooksDispatcherOnRerender.useMemoCache = useMemoCache;
  HooksDispatcherOnRerender.useHostTransitionStatus = useHostTransitionStatus;
  HooksDispatcherOnRerender.useFormState = rerenderActionState;
  HooksDispatcherOnRerender.useActionState = rerenderActionState;
  HooksDispatcherOnRerender.useOptimistic = function (passthrough, reducer) {
    var hook = updateWorkInProgressHook();
    if (null !== currentHook)
      return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
    hook.baseState = passthrough;
    return [passthrough, hook.queue.dispatch];
  };
  var now = Scheduler.unstable_now,
    commitTime = 0,
    layoutEffectStartTime = -1,
    profilerStartTime = -1,
    passiveEffectStartTime = -1,
    currentUpdateIsNested = !1,
    nestedUpdateScheduled = !1,
    classComponentUpdater = {
      isMounted: function (component) {
        return (component = component._reactInternals)
          ? getNearestMountedFiber(component) === component
          : !1;
      },
      enqueueSetState: function (inst, payload, callback) {
        inst = inst._reactInternals;
        var lane = requestUpdateLane(),
          update = createUpdate(lane);
        update.payload = payload;
        void 0 !== callback &&
          null !== callback &&
          (update.callback = callback);
        payload = enqueueUpdate(inst, update, lane);
        null !== payload &&
          (scheduleUpdateOnFiber(payload, inst, lane),
          entangleTransitions(payload, inst, lane));
        markStateUpdateScheduled(inst, lane);
      },
      enqueueReplaceState: function (inst, payload, callback) {
        inst = inst._reactInternals;
        var lane = requestUpdateLane(),
          update = createUpdate(lane);
        update.tag = 1;
        update.payload = payload;
        void 0 !== callback &&
          null !== callback &&
          (update.callback = callback);
        payload = enqueueUpdate(inst, update, lane);
        null !== payload &&
          (scheduleUpdateOnFiber(payload, inst, lane),
          entangleTransitions(payload, inst, lane));
        markStateUpdateScheduled(inst, lane);
      },
      enqueueForceUpdate: function (inst, callback) {
        inst = inst._reactInternals;
        var lane = requestUpdateLane(),
          update = createUpdate(lane);
        update.tag = 2;
        void 0 !== callback &&
          null !== callback &&
          (update.callback = callback);
        callback = enqueueUpdate(inst, update, lane);
        null !== callback &&
          (scheduleUpdateOnFiber(callback, inst, lane),
          entangleTransitions(callback, inst, lane));
        null !== injectedProfilingHooks &&
          "function" ===
            typeof injectedProfilingHooks.markForceUpdateScheduled &&
          injectedProfilingHooks.markForceUpdateScheduled(inst, lane);
      }
    },
    reportGlobalError =
      "function" === typeof reportError
        ? reportError
        : function (error) {
            if (
              "object" === typeof window &&
              "function" === typeof window.ErrorEvent
            ) {
              var event = new window.ErrorEvent("error", {
                bubbles: !0,
                cancelable: !0,
                message:
                  "object" === typeof error &&
                  null !== error &&
                  "string" === typeof error.message
                    ? String(error.message)
                    : String(error),
                error: error
              });
              if (!window.dispatchEvent(event)) return;
            } else if (
              "object" === typeof process &&
              "function" === typeof process.emit
            ) {
              process.emit("uncaughtException", error);
              return;
            }
            console.error(error);
          },
    SelectiveHydrationException = Error(formatProdErrorMessage(461)),
    didReceiveUpdate = !1,
    SUSPENDED_MARKER = { dehydrated: null, treeContext: null, retryLane: 0 },
    valueCursor = createCursor(null),
    currentlyRenderingFiber = null,
    lastContextDependency = null,
    lastFullyObservedContext = null,
    AbortControllerLocal =
      "undefined" !== typeof AbortController
        ? AbortController
        : function () {
            var listeners = [],
              signal = (this.signal = {
                aborted: !1,
                addEventListener: function (type, listener) {
                  listeners.push(listener);
                }
              });
            this.abort = function () {
              signal.aborted = !0;
              listeners.forEach(function (listener) {
                return listener();
              });
            };
          },
    scheduleCallback$1 = Scheduler.unstable_scheduleCallback,
    NormalPriority = Scheduler.unstable_NormalPriority,
    CacheContext = {
      $$typeof: REACT_CONTEXT_TYPE,
      Consumer: null,
      Provider: null,
      _currentValue: null,
      _currentValue2: null,
      _threadCount: 0
    },
    prevOnStartTransitionFinish = ReactSharedInternals.S;
  ReactSharedInternals.S = function (transition, returnValue) {
    "object" === typeof returnValue &&
      null !== returnValue &&
      "function" === typeof returnValue.then &&
      entangleAsyncAction(transition, returnValue);
    null !== prevOnStartTransitionFinish &&
      prevOnStartTransitionFinish(transition, returnValue);
  };
  var resumedCache = createCursor(null),
    offscreenSubtreeIsHidden = !1,
    offscreenSubtreeWasHidden = !1,
    needsFormReset = !1,
    PossiblyWeakSet = "function" === typeof WeakSet ? WeakSet : Set,
    nextEffect = null,
    inProgressLanes = null,
    inProgressRoot = null,
    shouldFireAfterActiveInstanceBlur = !1,
    hostParent = null,
    hostParentIsContainer = !1,
    currentHoistableRoot = null,
    suspenseyCommitFlag = 8192,
    DefaultAsyncDispatcher = {
      getCacheForType: function (resourceType) {
        var cache = readContext(CacheContext),
          cacheForType = cache.data.get(resourceType);
        void 0 === cacheForType &&
          ((cacheForType = resourceType()),
          cache.data.set(resourceType, cacheForType));
        return cacheForType;
      }
    },
    COMPONENT_TYPE = 0,
    HAS_PSEUDO_CLASS_TYPE = 1,
    ROLE_TYPE = 2,
    TEST_NAME_TYPE = 3,
    TEXT_TYPE = 4;
  if ("function" === typeof Symbol && Symbol.for) {
    var symbolFor = Symbol.for;
    COMPONENT_TYPE = symbolFor("selector.component");
    HAS_PSEUDO_CLASS_TYPE = symbolFor("selector.has_pseudo_class");
    ROLE_TYPE = symbolFor("selector.role");
    TEST_NAME_TYPE = symbolFor("selector.test_id");
    TEXT_TYPE = symbolFor("selector.text");
  }
  var PossiblyWeakMap = "function" === typeof WeakMap ? WeakMap : Map,
    executionContext = 0,
    workInProgressRoot = null,
    workInProgress = null,
    workInProgressRootRenderLanes = 0,
    workInProgressSuspendedReason = 0,
    workInProgressThrownValue = null,
    workInProgressRootDidAttachPingListener = !1,
    entangledRenderLanes = 0,
    workInProgressRootExitStatus = 0,
    workInProgressRootSkippedLanes = 0,
    workInProgressRootInterleavedUpdatedLanes = 0,
    workInProgressRootPingedLanes = 0,
    workInProgressDeferredLane = 0,
    workInProgressRootConcurrentErrors = null,
    workInProgressRootRecoverableErrors = null,
    workInProgressRootDidIncludeRecursiveRenderUpdate = !1,
    didIncludeCommitPhaseUpdate = !1,
    globalMostRecentFallbackTime = 0,
    workInProgressRootRenderTargetTime = Infinity,
    workInProgressTransitions = null,
    legacyErrorBoundariesThatAlreadyFailed = null,
    rootDoesHavePassiveEffects = !1,
    rootWithPendingPassiveEffects = null,
    pendingPassiveEffectsLanes = 0,
    pendingPassiveProfilerEffects = [],
    pendingPassiveEffectsRemainingLanes = 0,
    pendingPassiveTransitions = null,
    nestedUpdateCount = 0,
    rootWithNestedUpdates = null;
  exports.attemptContinuousHydration = function (fiber) {
    if (13 === fiber.tag) {
      var root = enqueueConcurrentRenderForLane(fiber, 67108864);
      null !== root && scheduleUpdateOnFiber(root, fiber, 67108864);
      markRetryLaneIfNotHydrated(fiber, 67108864);
    }
  };
  exports.attemptHydrationAtCurrentPriority = function (fiber) {
    if (13 === fiber.tag) {
      var lane = requestUpdateLane(),
        root = enqueueConcurrentRenderForLane(fiber, lane);
      null !== root && scheduleUpdateOnFiber(root, fiber, lane);
      markRetryLaneIfNotHydrated(fiber, lane);
    }
  };
  exports.attemptSynchronousHydration = function (fiber) {
    switch (fiber.tag) {
      case 3:
        fiber = fiber.stateNode;
        if (fiber.current.memoizedState.isDehydrated) {
          var lanes = getHighestPriorityLanes(fiber.pendingLanes);
          if (0 !== lanes) {
            fiber.pendingLanes |= 2;
            for (fiber.entangledLanes |= 2; lanes; ) {
              var lane = 1 << (31 - clz32(lanes));
              fiber.entanglements[1] |= lane;
              lanes &= ~lane;
            }
            ensureRootIsScheduled(fiber);
            0 === (executionContext & 6) &&
              ((workInProgressRootRenderTargetTime = now$1() + 500),
              flushSyncWorkAcrossRoots_impl(!1));
          }
        }
        break;
      case 13:
        (lanes = enqueueConcurrentRenderForLane(fiber, 2)),
          null !== lanes && scheduleUpdateOnFiber(lanes, fiber, 2),
          flushSyncWork(),
          markRetryLaneIfNotHydrated(fiber, 2);
    }
  };
  exports.batchedUpdates = function (fn, a) {
    return fn(a);
  };
  exports.createComponentSelector = function (component) {
    return { $$typeof: COMPONENT_TYPE, value: component };
  };
  exports.createContainer = function (
    containerInfo,
    tag,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onUncaughtError,
    onCaughtError,
    onRecoverableError,
    transitionCallbacks
  ) {
    return createFiberRoot(
      containerInfo,
      tag,
      !1,
      null,
      hydrationCallbacks,
      isStrictMode,
      concurrentUpdatesByDefaultOverride,
      identifierPrefix,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      transitionCallbacks,
      null
    );
  };
  exports.createHasPseudoClassSelector = function (selectors) {
    return { $$typeof: HAS_PSEUDO_CLASS_TYPE, value: selectors };
  };
  exports.createHydrationContainer = function (
    initialChildren,
    callback,
    containerInfo,
    tag,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onUncaughtError,
    onCaughtError,
    onRecoverableError,
    transitionCallbacks,
    formState
  ) {
    initialChildren = createFiberRoot(
      containerInfo,
      tag,
      !0,
      initialChildren,
      hydrationCallbacks,
      isStrictMode,
      concurrentUpdatesByDefaultOverride,
      identifierPrefix,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      transitionCallbacks,
      formState
    );
    initialChildren.context = getContextForSubtree(null);
    containerInfo = initialChildren.current;
    tag = requestUpdateLane();
    hydrationCallbacks = createUpdate(tag);
    hydrationCallbacks.callback =
      void 0 !== callback && null !== callback ? callback : null;
    enqueueUpdate(containerInfo, hydrationCallbacks, tag);
    initialChildren.current.lanes = tag;
    markRootUpdated(initialChildren, tag);
    ensureRootIsScheduled(initialChildren);
    return initialChildren;
  };
  exports.createPortal = function (children, containerInfo, implementation) {
    var key =
      3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
    return {
      $$typeof: REACT_PORTAL_TYPE,
      key: null == key ? null : "" + key,
      children: children,
      containerInfo: containerInfo,
      implementation: implementation
    };
  };
  exports.createRoleSelector = function (role) {
    return { $$typeof: ROLE_TYPE, value: role };
  };
  exports.createTestNameSelector = function (id) {
    return { $$typeof: TEST_NAME_TYPE, value: id };
  };
  exports.createTextSelector = function (text) {
    return { $$typeof: TEXT_TYPE, value: text };
  };
  exports.defaultOnCaughtError = function (error) {
    console.error(error);
  };
  exports.defaultOnRecoverableError = function (error) {
    reportGlobalError(error);
  };
  exports.defaultOnUncaughtError = function (error) {
    reportGlobalError(error);
  };
  exports.deferredUpdates = function (fn) {
    var prevTransition = ReactSharedInternals.T,
      previousPriority = getCurrentUpdatePriority();
    try {
      return (
        setCurrentUpdatePriority(32), (ReactSharedInternals.T = null), fn()
      );
    } finally {
      setCurrentUpdatePriority(previousPriority),
        (ReactSharedInternals.T = prevTransition);
    }
  };
  exports.discreteUpdates = function (fn, a, b, c, d) {
    var prevTransition = ReactSharedInternals.T,
      previousPriority = getCurrentUpdatePriority();
    try {
      return (
        setCurrentUpdatePriority(2),
        (ReactSharedInternals.T = null),
        fn(a, b, c, d)
      );
    } finally {
      setCurrentUpdatePriority(previousPriority),
        (ReactSharedInternals.T = prevTransition),
        0 === executionContext &&
          (workInProgressRootRenderTargetTime = now$1() + 500);
    }
  };
  exports.findAllNodes = findAllNodes;
  exports.findBoundingRects = function (hostRoot, selectors) {
    if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
    selectors = findAllNodes(hostRoot, selectors);
    hostRoot = [];
    for (var i = 0; i < selectors.length; i++)
      hostRoot.push(getBoundingRect(selectors[i]));
    for (selectors = hostRoot.length - 1; 0 < selectors; selectors--) {
      i = hostRoot[selectors];
      for (
        var targetLeft = i.x,
          targetRight = targetLeft + i.width,
          targetTop = i.y,
          targetBottom = targetTop + i.height,
          j = selectors - 1;
        0 <= j;
        j--
      )
        if (selectors !== j) {
          var otherRect = hostRoot[j],
            otherLeft = otherRect.x,
            otherRight = otherLeft + otherRect.width,
            otherTop = otherRect.y,
            otherBottom = otherTop + otherRect.height;
          if (
            targetLeft >= otherLeft &&
            targetTop >= otherTop &&
            targetRight <= otherRight &&
            targetBottom <= otherBottom
          ) {
            hostRoot.splice(selectors, 1);
            break;
          } else if (
            !(
              targetLeft !== otherLeft ||
              i.width !== otherRect.width ||
              otherBottom < targetTop ||
              otherTop > targetBottom
            )
          ) {
            otherTop > targetTop &&
              ((otherRect.height += otherTop - targetTop),
              (otherRect.y = targetTop));
            otherBottom < targetBottom &&
              (otherRect.height = targetBottom - otherTop);
            hostRoot.splice(selectors, 1);
            break;
          } else if (
            !(
              targetTop !== otherTop ||
              i.height !== otherRect.height ||
              otherRight < targetLeft ||
              otherLeft > targetRight
            )
          ) {
            otherLeft > targetLeft &&
              ((otherRect.width += otherLeft - targetLeft),
              (otherRect.x = targetLeft));
            otherRight < targetRight &&
              (otherRect.width = targetRight - otherLeft);
            hostRoot.splice(selectors, 1);
            break;
          }
        }
    }
    return hostRoot;
  };
  exports.findHostInstance = findHostInstance;
  exports.findHostInstanceWithNoPortals = function (fiber) {
    fiber = findCurrentFiberUsingSlowPath(fiber);
    fiber =
      null !== fiber ? findCurrentHostFiberWithNoPortalsImpl(fiber) : null;
    return null === fiber ? null : getPublicInstance(fiber.stateNode);
  };
  exports.findHostInstanceWithWarning = function (component) {
    return findHostInstance(component);
  };
  exports.flushPassiveEffects = flushPassiveEffects;
  exports.flushSyncFromReconciler = function (fn) {
    var prevExecutionContext = executionContext;
    executionContext |= 1;
    var prevTransition = ReactSharedInternals.T,
      previousPriority = getCurrentUpdatePriority();
    try {
      if ((setCurrentUpdatePriority(2), (ReactSharedInternals.T = null), fn))
        return fn();
    } finally {
      setCurrentUpdatePriority(previousPriority),
        (ReactSharedInternals.T = prevTransition),
        (executionContext = prevExecutionContext),
        0 === (executionContext & 6) && flushSyncWorkAcrossRoots_impl(!1);
    }
  };
  exports.flushSyncWork = flushSyncWork;
  exports.focusWithin = function (hostRoot, selectors) {
    if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
    hostRoot = findFiberRootForHostRoot(hostRoot);
    selectors = findPaths(hostRoot, selectors);
    selectors = Array.from(selectors);
    for (hostRoot = 0; hostRoot < selectors.length; ) {
      var fiber = selectors[hostRoot++],
        tag = fiber.tag;
      if (!isHiddenSubtree(fiber)) {
        if (
          (5 === tag || 26 === tag || 27 === tag) &&
          setFocusIfFocusable(fiber.stateNode)
        )
          return !0;
        for (fiber = fiber.child; null !== fiber; )
          selectors.push(fiber), (fiber = fiber.sibling);
      }
    }
    return !1;
  };
  exports.getFindAllNodesFailureDescription = function (hostRoot, selectors) {
    if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
    var maxSelectorIndex = 0,
      matchedNames = [];
    hostRoot = [findFiberRootForHostRoot(hostRoot), 0];
    for (var index = 0; index < hostRoot.length; ) {
      var fiber = hostRoot[index++],
        tag = fiber.tag,
        selectorIndex = hostRoot[index++],
        selector = selectors[selectorIndex];
      if ((5 !== tag && 26 !== tag && 27 !== tag) || !isHiddenSubtree(fiber))
        if (
          (matchSelector(fiber, selector) &&
            (matchedNames.push(selectorToString(selector)),
            selectorIndex++,
            selectorIndex > maxSelectorIndex &&
              (maxSelectorIndex = selectorIndex)),
          selectorIndex < selectors.length)
        )
          for (fiber = fiber.child; null !== fiber; )
            hostRoot.push(fiber, selectorIndex), (fiber = fiber.sibling);
    }
    if (maxSelectorIndex < selectors.length) {
      for (
        hostRoot = [];
        maxSelectorIndex < selectors.length;
        maxSelectorIndex++
      )
        hostRoot.push(selectorToString(selectors[maxSelectorIndex]));
      return (
        "findAllNodes was able to match part of the selector:\n  " +
        (matchedNames.join(" > ") +
          "\n\nNo matching component was found for:\n  ") +
        hostRoot.join(" > ")
      );
    }
    return null;
  };
  exports.getPublicRootInstance = function (container) {
    container = container.current;
    if (!container.child) return null;
    switch (container.child.tag) {
      case 27:
      case 5:
        return getPublicInstance(container.child.stateNode);
      default:
        return container.child.stateNode;
    }
  };
  exports.injectIntoDevTools = function (devToolsConfig) {
    return injectInternals({
      bundleType: devToolsConfig.bundleType,
      version: devToolsConfig.version,
      rendererPackageName: devToolsConfig.rendererPackageName,
      rendererConfig: devToolsConfig.rendererConfig,
      overrideHookState: null,
      overrideHookStateDeletePath: null,
      overrideHookStateRenamePath: null,
      overrideProps: null,
      overridePropsDeletePath: null,
      overridePropsRenamePath: null,
      setErrorHandler: null,
      setSuspenseHandler: null,
      scheduleUpdate: null,
      currentDispatcherRef: ReactSharedInternals,
      findHostInstanceByFiber: findHostInstanceByFiber,
      findFiberByHostInstance:
        devToolsConfig.findFiberByHostInstance || emptyFindFiberByHostInstance,
      findHostInstancesForRefresh: null,
      scheduleRefresh: null,
      scheduleRoot: null,
      setRefreshHandler: null,
      getCurrentFiber: null,
      reconcilerVersion: "19.0.0-rc-df5f2736-20240712"
    });
  };
  exports.isAlreadyRendering = function () {
    return !1;
  };
  exports.observeVisibleRects = function (
    hostRoot,
    selectors,
    callback,
    options
  ) {
    if (!supportsTestSelectors) throw Error(formatProdErrorMessage(363));
    hostRoot = findAllNodes(hostRoot, selectors);
    var disconnect = setupIntersectionObserver(
      hostRoot,
      callback,
      options
    ).disconnect;
    return {
      disconnect: function () {
        disconnect();
      }
    };
  };
  exports.shouldError = function () {
    return null;
  };
  exports.shouldSuspend = function () {
    return !1;
  };
  exports.startHostTransition = function (
    formFiber,
    pendingState,
    action,
    formData
  ) {
    if (5 !== formFiber.tag) throw Error(formatProdErrorMessage(476));
    var queue = ensureFormComponentIsStateful(formFiber).queue;
    startTransition(
      formFiber,
      queue,
      pendingState,
      NotPendingTransition,
      null === action
        ? noop
        : function () {
            var resetStateQueue =
              ensureFormComponentIsStateful(formFiber).next.queue;
            dispatchSetState(formFiber, resetStateQueue, {});
            return action(formData);
          }
    );
  };
  exports.updateContainer = function (
    element,
    container,
    parentComponent,
    callback
  ) {
    var current = container.current,
      lane = requestUpdateLane();
    updateContainerImpl(
      current,
      lane,
      element,
      container,
      parentComponent,
      callback
    );
    return lane;
  };
  exports.updateContainerSync = function (
    element,
    container,
    parentComponent,
    callback
  ) {
    0 === container.tag && flushPassiveEffects();
    updateContainerImpl(
      container.current,
      2,
      element,
      container,
      parentComponent,
      callback
    );
    return 2;
  };
  return exports;
};
module.exports.default = module.exports;
Object.defineProperty(module.exports, "__esModule", { value: !0 });
