'use client';

import { useRouter } from 'next/navigation'
import React, { Suspense, useEffect, useRef, useState, useMemo, forwardRef, use } from 'react'
import { z } from 'zod';
// import { zodResponseFormat } from 'openai/helpers/zod';
import { Canvas, useThree, useFrame } from '@react-three/fiber'
// import { Physics, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { OrbitControls, KeyboardControls, Text, GradientTexture, MapControls, KeyboardControlsEntry, useKeyboardControls } from '@react-three/drei'
import dedent from 'dedent';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  Vector2,
  Vector3,
  Quaternion,
  Matrix4,
  Object3D,
  Scene,
  Camera,
  PerspectiveCamera,
  Raycaster,
  Plane,
  Box2,
  Box3,
  Mesh,
  InstancedMesh,
  TextureLoader,
  NoToneMapping,
  Texture,
  BufferGeometry,
  BoxGeometry,
  DataTexture,
  RGBAFormat,
  UnsignedByteType,
  NearestFilter,
  PlaneGeometry,
  BufferAttribute,
  ShaderMaterial,
  Color,
  DoubleSide,
  SphereGeometry,
} from 'three';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Button } from '@/components/ui/button';
// import { CapsuleGeometry } from '@/utils/three/CapsuleGeometry.mjs';
// import {
//   // r2EndpointUrl,
//   aiProxyHost,
// } from '@/utils/const/endpoints';
import { getJWT } from '@/lib/jwt';
import { LocalforageLoader } from '@/utils/localforage-loader';
import { fetchJsonCompletion } from '@/utils/fetch';
import { fetchImageGeneration } from 'react-agents/util/generate-image.mjs';
// import { defaultOpenAIModel } from '@/utils/const/defaults.js';
import { ChatMessage } from '@/utils/fetch';
import { useTextureLoaderUrl } from '@/utils/texture-utils';

//

const mapDefaultPrompt = `epic anime adventure`;
const mapStyle = `anime style map segment, top down overhead view`;

//

const coordSep = ':';
export const getMapUrlCoord = (u: URL) => {
  const query = u.searchParams;
  const coordString = query.get('coord');
  if (coordString) {
    const [x, z] = coordString.split(coordSep).map(parseFloat);
    if (!isNaN(x) && !isNaN(z)) {
      const coord = { x, z } as Coord2D;
      return coord;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
};
export const setMapUrlCoord = (coord: Coord2D) => {
  const u = new URL(location.href);
  u.searchParams.set('coord', `${coord.x.toFixed(2)}${coordSep}${coord.z.toFixed(2)}`);
  // const s = u.pathname + u.search;
  const s = u + '';
  // console.log('onMove replace', s, new Error().stack);
  // await router.replace(s);
  history.replaceState(null, '', s);
};
const roundToDecimals = (n: number, decimals: number) => {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
};
export const snapCoord = (coord: Coord2D) => {
  return {
    x: roundToDecimals(coord.x, 2),
    z: roundToDecimals(coord.z, 2),
  } as Coord2D;
};
const getCoordsKey = (x: number, z: number) => `${x}${coordSep}${z}`;
const getCoordKey = (coord: Coord2D) => getCoordsKey(coord.x, coord.z);

//

class SquareGeometry extends BufferGeometry {
  constructor(h: number, borderSize: number) {
    const vBarGeometry = new BoxGeometry(borderSize, h, borderSize);
    const hBarGeometry = vBarGeometry.clone().applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2));
    const geometries = [
      // left
      vBarGeometry.clone()
        .translate(-h / 2 + borderSize / 2, 0, 0),
      // right
      vBarGeometry.clone()
        .translate(h / 2 - borderSize / 2, 0, 0),
      // top
      hBarGeometry.clone()
        .translate(0, h / 2 - borderSize / 2, 0),
      // bottom
      hBarGeometry.clone()
        .translate(0, -h / 2 + borderSize / 2, 0),
    ];
    const geometry = BufferGeometryUtils.mergeGeometries(geometries)
      .scale(1, 1, 0);

    super();
    this.copy(geometry);
  }
}
enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  shift = 'shift',
  jump = 'jump',
};

// const planeScale = 0.9;
const planeGeometry = new PlaneGeometry(1, 1)
  // .scale(planeScale, planeScale, 1)
  .rotateX(-Math.PI / 2);
const rotateXQuaternion = new Quaternion()
  .setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
const squareGeometry = new SquareGeometry(1, 0.02)
  .rotateX(-Math.PI / 2);

const biomesEnum = z.enum([
  "badlands",
  "bamboo_jungle",
  "basalt_deltas",
  "beach",
  "birch_forest",
  "cherry_grove",
  "cold_ocean",
  "crimson_forest",
  "dark_forest",
  "deep_cold_ocean",
  "deep_dark",
  "deep_frozen_ocean",
  "deep_lukewarm_ocean",
  "deep_ocean",
  "desert",
  "dripstone_caves",
  "end_barrens",
  "end_highlands",
  "end_midlands",
  "eroded_badlands",
  "flower_forest",
  "forest",
  "frozen_ocean",
  "frozen_peaks",
  "frozen_river",
  "grove",
  "ice_spikes",
  "jagged_peaks",
  "jungle",
  "lukewarm_ocean",
  "lush_caves",
  "mangrove_swamp",
  "meadow",
  "mushroom_fields",
  "nether_wastes",
  "ocean",
  "old_growth_birch_forest",
  "old_growth_pine_taiga",
  "old_growth_spruce_taiga",
  "plains",
  "river",
  "savanna",
  "savanna_plateau",
  "small_end_islands",
  "snowy_beach",
  "snowy_plains",
  "snowy_slopes",
  "snowy_taiga",
  "soul_sand_valley",
  "sparse_jungle",
  "stony_peaks",
  "stony_shore",
  "sunflower_plains",
  "swamp",
  "taiga",
  "the_end",
  "the_void",
  "warm_ocean",
  "warped_forest",
  "windswept_forest",
  "windswept_gravelly_hills",
  "windswept_hills",
  "windswept_savanna",
  "wooded_badlands"
]);

export interface Coord2D {
  x: number,
  z: number,
}
interface TileCandidateSpec {
  coord: Coord2D,
}
interface TileSpecJson {
  name: string,
  visual_description: string,
  biome: string,
  temperature: number,
  wetness: number,
  points_of_interest: string[],
  exits: string[],
}
type TileSpec = TileCandidateSpec & {
  json: TileSpecJson | null,
  image: Blob | null,
};
interface TileLoad {
  coord: Coord2D,
  loading: boolean,
}

const makeLandUrl = (id: string, { x, z }: Coord2D, {
  edit,
}: {
  edit: boolean,
}) => {
  const u = new URL(`/land/${id}/${[x, z].join(',')}`, location.href);
  edit && u.searchParams.set('edit', '');
  return u.href
    .replace(/=$/g, '')
    .replace(/=&/g, '');
};

const isTileValid = (tileSpec: TileSpec) => (
  !!tileSpec.json
);
const isTileGenerated = (tileSpec: TileSpec) => (
  !!tileSpec.json &&
  !!tileSpec.image
);
const ensureTile = async ({
  tileSpec,
  tileLoad,
}: {
  tileSpec: TileSpec,
  tileLoad: TileLoad,
}, {
 prompt,
 tileSpecs,
}: {
  prompt: string,
  tileSpecs: TileSpec[],
}, onChange: () => void) => {
  const { coord } = tileSpec;

  let { json } = tileSpec;
  if (!json) {
    json = await generateTileJson(coord, {
      prompt,
      tileSpecs,
    });
    tileSpec.json = json;
    onChange();
  }

  let { image } = tileSpec;
  if (!image) {
    image = await generateTileImage(json);
    tileSpec.image = image;
    tileLoad.loading = false; // note: must happen before onChange so it gets picked up
    onChange();
  }
};
const generateTileJson = async (rootCoord: Coord2D, {
  prompt,
  tileSpecs,
}: {
  prompt: string,
  tileSpecs: TileSpec[],
}) => {
  const jwt = await getJWT();
  if (jwt) {
    const tilePromptRange = 3;
    if (tilePromptRange % 2 === 0) {
      throw new Error('tilePromptRange must be odd');
    }
    const rangeDelta = Math.floor((tilePromptRange - 1) / 2);

    const promptGrid = (() => {
      const result: TileSpec[][] = [];
      for (let dz = -rangeDelta; dz <= rangeDelta; dz++) {
        const row: TileSpec[] = [];

        for (let dx = -rangeDelta; dx <= rangeDelta; dx++) {
          const x = rootCoord.x + dx;
          const z = rootCoord.z + dz;
          const gridCoord = { x, z };

          const localTileSpec: TileSpec | undefined = tileSpecs.find(tileSpec =>
            tileSpec.coord.x === gridCoord.x &&
            tileSpec.coord.z === gridCoord.z
          );
          if (localTileSpec) {
            row.push({
              coord: gridCoord,
              json: localTileSpec.json,
              image: null,
            });
          } else {
            row.push({
              coord: gridCoord,
              json: null,
              image: null,
            });
          }
        }

        result.push(row);
      }
      return result;
    })();

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: dedent`\
          Generate a JSON location in an RPG video game overworld to fill in a hole in our map.
          Locations are roughly 100x100 meters, so they should change gradually over distance. For example, a lush jungle should not be next to a city or a glacier.
          Tiles are shown from an overhead view, in a ${tilePromptRange}x${tilePromptRange} grid.
          The top-left tile is at (x, z) = (0, 0), and the bottom-right tile is at (${tilePromptRange - 1}, ${tilePromptRange - 1}).
          The JSON representation is a 2D array of objects viewed from top down. Laid out west to east, north to south.
          \`temperature\` is a number from 0 to 1 representing how hot or cold the tile is.
          \`wetness\` is a number from 0 to 1 representing how wet or dry the tile is.
          The \`exits\` key represents whether it is possible for a character to traverse to the next tile in that direction.

          # Current layout
          GENERATE_THIS marks the location to fill in
          \`\`\`
          ${promptGrid.map(row => {
            return row.map(col => {
              if (col.coord.x === rootCoord.x && col.coord.z === rootCoord.z) {
                return `GENERATE_THIS, // "coord":${JSON.stringify(col.coord)}`;
              } else {
                const {
                  coord,
                  json,
                } = col;
                return JSON.stringify({
                  coord,
                  json,
                }) + ',';
              }
            }).join('\n');
          }).join(',\n')}
          \`\`\`

          # Prompt
          \`\`\`
        ` + '\n' +
          prompt + '\n' +
        `\`\`\``,
      },
    ];
    const format = z.object({
      tile: z.object({
        coord: z.object({
          x: z.number(),
          z: z.number(),
        }),
        json: z.object({
          name: z.string(),
          visual_description: z.string(),
          biome: biomesEnum,
          temperature: z.number(),
          wetness: z.number(),
          points_of_interest: z.array(z.string()),
          exits: z.array(z.enum(['north', 'south', 'east', 'west'])),
        }),
      }),
    });
    // console.log('got request', { messages });
    const o = await fetchJsonCompletion({
      messages,
    }, format, {
      jwt,
    });
    const tileSpec = (o as any).tile as TileSpec;
    // console.log('got response', tileSpec);
    const json = tileSpec.json as TileSpecJson;
    return json;
  } else {
    throw new Error('no jwt');
  }
};
const generateTileImage = async (tileJson: TileSpecJson) => {
  const prompt = `${mapStyle}\n${tileJson.visual_description}`;
  const jwt = await getJWT();
  const blob = await fetchImageGeneration(prompt, {
    image_size: 'square_hd',
  }, {
    jwt,
  });
  return blob;
};
/* const generateMap = async ({
  prompt,
  width = 3,
  height = 3,
}: {
  prompt: string,
  width?: number,
  height?: number,
}) => {
  const jwt = await getJWT();
  if (jwt) {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: dedent`\
          Generate an array of JSON map tile descriptions for an RPG game overworld.
          The tiles are roughly 100x100 meters, so they should change gradually over distance. For example, a lush jungle tile should not be next to a city or a glacier.
          Tiles are shown from an overhead view, in a ${width}x${height} grid.
          The top-left tile is at (x, z) = (0, 0), and the bottom-right tile is at (${width - 1}, ${height - 1}).
          The JSON representation is a 2D array of objects, west to east, north to south.
          \`temperature\` is a number from 0 to 1 representing how hot or cold the tile is.
          \`wetness\` is a number from 0 to 1 representing how wet or dry the tile is.
          The \`exits\` key represents whether it is possible for a character to traverse to the next tile in that direction.

          Use the following prompt:
        ` + '\n' +
          prompt,
      },
    ];
    const format = z.object({
      tiles: z.array(z.array(z.object({
        coord: z.object({
          x: z.number(),
          z: z.number(),
        }),
        name: z.string(),
        visual_description: z.string(),
        biome: biomesEnum,
        temperature: z.number(),
        wetness: z.number(),
        points_of_interest: z.array(z.string()),
        exits: z.array(z.enum(['north', 'south', 'east', 'west'])),
      }))),
    });
    const grid = await fetchJsonCompletion(messages, format, {
      jwt,
    });

    const tileSpecs: TileSpec[] = [];
    for (let z = 0; z < height; z++) {
      const row = grid.tiles[z];
      if (row.length !== width) {
        throw new Error(`row ${z} has length ${row.length} instead of ${width}`);
      }
      for (let x = 0; x < width; x++) {
        let tileSpec = row[x];
        if (tileSpec.coord.x !== x || tileSpec.coord.z !== z) {
          throw new Error(`tile at (${x}, ${z}) has x, z of ${tileSpec.x}, ${tileSpec.z}`);
        }
        tileSpec = {
          ...tileSpec,
          image: null,
        };
        tileSpecs.push(tileSpec);
      }
    }
    return tileSpecs;
  } else {
    throw new Error('no jwt');
  }
}; */

//

class TileLoader extends LocalforageLoader<TileSpec[]> {
  constructor({
    id = '',
  } = {}) {
    super({
      key: `tiles:${id}`,
      defaultValue: () => [],
    });
  }
}

//

type AnchorXType = number | "center" | "left" | "right" | undefined;
type AnchorYType = number | "top" | "bottom" | "top-baseline" | "middle" | "bottom-baseline" | undefined;
type Text3DProps = {
  children?: string,
  font?: string,
  fontSize?: number,
  lineHeight?: number,
  color?: number,
  bgColor?: number,
  anchorX?: AnchorXType,
  anchorY?: AnchorYType,
  position?: [number, number, number] | Vector3,
  quaternion?: [number, number, number, number] | Quaternion,
  scale?: [number, number, number] | Vector3,
};

// const defaultFont = '/fonts/WinchesterCaps.ttf',
const defaultFont = '/fonts/Plaza Regular.ttf';
const defaultFontSize = 0.05;
const defaultLineHeight = 1.2;
const Text3D = forwardRef(({
  children = '',
  position,
  quaternion,
  scale,
  font = defaultFont,
  fontSize = defaultFontSize,
  lineHeight = defaultLineHeight,
  color = 0xFFFFFF,
  bgColor = 0x000000,
  anchorX = "left",
  anchorY = "top",
  // ...rest
}: Text3DProps, ref: any) => {
  const numLines = 8;
  const boxWidth = 0.75;
  const boxHeight = fontSize * lineHeight * numLines;
  const padding = 0.02;
  return (
    <Suspense>
      <object3D
        position={position}
        quaternion={quaternion}
        scale={scale}
        ref={ref}
      >
        <mesh position={[-padding, padding, 0]}>
          <planeGeometry args={[boxWidth + padding * 2, boxHeight + padding * 2]} />
          <meshBasicMaterial>
          <GradientTexture
            stops={[0, 1]} // As many stops as you want
            colors={[0x111111, 0x222222]} // Colors need to match the number of stops
            size={1024} // Size is optional, default = 1024
          />
        </meshBasicMaterial>
        </mesh>
        <Text
          position={[-boxWidth / 2 - padding, boxHeight / 2 + padding, 0.001]}
          font={font}
          fontSize={fontSize}
          lineHeight={lineHeight}
          color={color}
          maxWidth={boxWidth}
          anchorX={anchorX}
          anchorY={anchorY}
        >
          {children}
        </Text>
        <Text
          position={[-boxWidth / 2 - padding - 0.005, boxHeight / 2 + padding + 0.005, 0.001 - 0.005]}
          font={font}
          fontSize={fontSize}
          lineHeight={lineHeight}
          color={bgColor}
          maxWidth={boxWidth}
          anchorX={anchorX}
          anchorY={anchorY}
        >
          {children}
        </Text>
      </object3D>
    </Suspense>
  );
});
Text3D.displayName = 'Text3D';

const MapForm = ({
  eventTarget,
}: {
  eventTarget: EventTarget,
}) => {
  return (
    <form className="flex" onSubmit={e => {
      e.preventDefault();
      e.stopPropagation();
    }}>
      <Button variant="outline" className="text-xs mb-1" onClick={e => {
        const promptString = prompt(`Generate what scene? (e.g. "${mapDefaultPrompt}")`, mapDefaultPrompt);
        if (promptString) {
          eventTarget.dispatchEvent(new MessageEvent('generateMap', {
            data: {
              prompt: promptString,
            },
          }));
        }
      }}>Generate</Button>
      <Button variant="outline" className="text-xs mb-1" onClick={e => {
        eventTarget.dispatchEvent(new MessageEvent('clearMap', {
          data: null,
        }));
      }}>Clear</Button>
    </form>
  );
};
const Tile = ({
  tileSpec,
  textureLoader,
  tileLoads,
  // onRef,
  onMeshRef,
  children,
}: {
  tileSpec: TileSpec,
  textureLoader: TextureLoader,
  tileLoads: TileLoad[],
  // onRef?: (ref: Object3D | null) => void,
  onMeshRef?: (mesh: Mesh | null) => void,
  children?: React.ReactNode,
}) => {
  const {
    coord: {
      x,
      z,
    },
    json,
    image,
  } = tileSpec;
  const {
    // name,
    visual_description,
  } = json ?? {};
  const tileLoad = tileLoads.find(load =>
    load.coord.x === tileSpec.coord.x &&
    load.coord.z === tileSpec.coord.z
  ) as TileLoad;

  //

  const ref = useRef<Object3D>(null);
  const meshRef = useRef<Mesh>(null);
  const textureCache = useMemo(() => new WeakMap<Blob, Texture>(), []);

  useEffect(() => {
    onMeshRef && onMeshRef(meshRef.current);
  }, [meshRef.current]);

  //

  const position = new Vector3(x, 0, z);
  const color = tileLoad?.loading ? 0x0000FF : image ? 0x00FF00 : 0x000000;
  const texture = (() => {
    if (image) {
      let texture = textureCache.get(image);
      if (!texture) {
        const src = URL.createObjectURL(image);
        texture = textureLoader.load(src, () => {
          URL.revokeObjectURL(src);
        });
        textureCache.set(image, texture);
      }
      return texture;
    } else {
      return null;
    }
  })();

  return (
    <object3D position={position} ref={ref}>
      <mesh geometry={planeGeometry} ref={meshRef}>
        {texture ?
          <meshBasicMaterial map={texture} />
        :
          <meshPhongMaterial color={color} />
        }
      </mesh>
      <Text3D position={[0, 0.01, 0]} quaternion={rotateXQuaternion}>{visual_description}</Text3D>
      {children}
    </object3D>
  );
};
const TileCandidate = ({
  tileCandidateSpec,
  tileLoads,
  onMeshRef,
  children,
}: {
  tileCandidateSpec: TileCandidateSpec,
  tileLoads: TileLoad[],
  onMeshRef?: (mesh: Mesh | null) => void,
  children?: React.ReactNode,
}) => {
  const {
    coord: {
      x,
      z,
    },
  } = tileCandidateSpec;
  const tileLoad = tileLoads.find(load =>
    load.coord.x === tileCandidateSpec.coord.x &&
    load.coord.z === tileCandidateSpec.coord.z
  ) as TileLoad;

  //

  const ref = useRef<Object3D>(null);
  const meshRef = useRef<Mesh>(null);

  useEffect(() => {
    onMeshRef && onMeshRef(meshRef.current);
  }, [meshRef.current]);

  //

  const position = new Vector3(x, 0, z);
  const color = tileLoad?.loading ? 0x0000FF : 0x333333;

  return (
    <object3D position={position} ref={ref}>
      <mesh geometry={planeGeometry} ref={meshRef}>
        <meshBasicMaterial color={0xff0000} transparent opacity={0} alphaTest={0.5} />
      </mesh>
      <mesh geometry={squareGeometry}>
        <meshBasicMaterial color={color} />
      </mesh>
      <Text
        position={[0, 0.001, 0]}
        quaternion={rotateXQuaternion}
        font={defaultFont}
        fontSize={0.3}
        lineHeight={defaultLineHeight}
        color={color}
        maxWidth={1}
        anchorX='center'
        anchorY='middle'
      >
        ?
      </Text>
      {/* <Text3D
        position={[0, 0.01, 0]}
        color={color}
        quaternion={rotateXQuaternion}
      >?</Text3D> */}
      {children}
    </object3D>
  );
};
const ControllableObject = forwardRef(({
  position,
  onMove,
  onMoving,
  children,
}: {
  position: [number, number, number],
  onMove?: (position: Vector3) => any,
  onMoving?: (moving: boolean) => void,
  children: React.ReactNode,
}, ref: React.ForwardedRef<Object3D>) => {
  const internalRef = useRef<Object3D>(null);

  const [sub, get] = useKeyboardControls<Controls>();

  const initialValue = useMemo(() => Date.now(), []);
  const lastFrameTime = useRef<number>(initialValue);
  const lastFrameMoving = useRef<boolean>(false);

  const moveCameraOffset = useMemo(() => new Vector3(0, 2, 1).normalize().multiplyScalar(3), []);

  const { camera } = useThree();

  // bind the ref
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(internalRef.current);
      } else {
        ref.current = internalRef.current;
      }
    }
  }, [ref, internalRef.current]);

  // initialize camera
  useEffect(() => {
    camera.position.fromArray(position)
      .add(
        new Vector3(0, 1, 0)
      );
    // camera.quaternion.setFromRotationMatrix(
    //   new Matrix4().lookAt(
    //     camera.position,
    //     camera.position.clone()
    //       .add(
    //         new Vector3(0, -1, 0)
    //       ),
    //     new Vector3(0, 0, -1),
    //   )
    // );
    camera.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI * 0.5);
  }, []);

  // movement
  useFrame(() => {
    const object = internalRef.current;
    if (object) {
      const now = Date.now();
      const timeDiff = now - lastFrameTime.current;

      const moveDirection = new Vector3();
      const state = get();
      if (state.forward) {
        moveDirection.z = -1;
      }
      if (state.back) {
        moveDirection.z = 1;
      }
      if (state.left) {
        moveDirection.x = -1;
      }
      if (state.right) {
        moveDirection.x = 1;
      }

      const moving = moveDirection.lengthSq() > 0;
      if (moving) {
        moveDirection.normalize();

        const speed = 0.001 * (state.shift ? 3 : 1);
        const moveDelta = moveDirection.clone().multiplyScalar(speed * timeDiff);

        object.position.add(moveDelta);

        // console.log('set camera', object.position.toArray().join(', '));
        camera.position.copy(object.position)
          .add(
            moveCameraOffset.normalize()
          );
        camera.quaternion.setFromRotationMatrix(
          new Matrix4().lookAt(camera.position, object.position, new Vector3(0, 0, -1))
        );

        onMove && onMove(object.position);
      }

      if (onMoving) {
        if (moving && !lastFrameMoving.current) {
          onMoving(true);
        } else if (!moving && lastFrameMoving.current) {
          onMoving(false);
        }
      }

      lastFrameTime.current = now;
      lastFrameMoving.current = moving;
    }
  });

  /* useEffect(() => {
    const fns = [
      sub(
        (state) => state.forward,
        (pressed) => {
          console.log('forward', pressed)
        }
      ),
      sub(
        (state) => state.back,
        (pressed) => {
          console.log('back', pressed)
        }
      ),
      sub(
        (state) => state.left,
        (pressed) => {
          console.log('left', pressed)
        },
      ),
      sub(
        (state) => state.right,
        (pressed) => {
          console.log('right', pressed)
        },
      ),
      sub(
        (state) => state.shift,
        (pressed) => {
          console.log('shift', pressed)
        },
      ),
      sub(
        (state) => state.jump,
        (pressed) => {
          console.log('jump', pressed)
        },
      ),
    ];
    return () => {
      for (const fn of fns) {
        fn();
      }
    };
  }, []); */

  // console.log('initialize controllable', position);

  return (
    <object3D
      position={position}
      ref={internalRef}
    >
      {children}
    </object3D>
  );
});
ControllableObject.displayName = 'Controllable';
const MiniPlayer = forwardRef(({
  pfpUrl,
}: {
  pfpUrl: string,
}, ref) => {
  const circleSize = 0.2;
  const innerFactor = 0.9;
  const instanceCount = 5;

  const textureLoader = useMemo(() => new TextureLoader(), []);
  const pfpTexture = useTextureLoaderUrl(pfpUrl, {
    textureLoader,
  });

  const doubleSphereGeometry = useMemo(() => {
    // black color
    const sphereGeometry = new SphereGeometry(0.01, 32, 32);
    const makeColorsArray = (c: Color, count: number) => {
      const colorsArray = new Uint8Array(count * 3);
      for (let i = 0; i < colorsArray.length; i += 3) {
        colorsArray[i] = c.r * 255;
        colorsArray[i + 1] = c.g * 255;
        colorsArray[i + 2] = c.b * 255;
      }
      return colorsArray;
    };

    const blackColor = new Color(0x000000);
    const blackColorsArray = makeColorsArray(blackColor, sphereGeometry.attributes.position.count);
    const blackColorsGeometry = sphereGeometry.clone();
    blackColorsGeometry.attributes.color = new BufferAttribute(blackColorsArray, 3);

    // white color
    const whiteColor = new Color(0xFFFFFF);
    const whiteColorsArray = makeColorsArray(whiteColor, sphereGeometry.attributes.position.count);
    const whiteColorsGeometry = sphereGeometry.clone();
    whiteColorsGeometry.attributes.color = new BufferAttribute(whiteColorsArray, 3);
    // invert normals
    const outerScale = 1.2;
    whiteColorsGeometry.scale(-outerScale, -outerScale, -outerScale);

    const geometries = [
      whiteColorsGeometry,
      blackColorsGeometry,
    ];
    const geometry = BufferGeometryUtils.mergeGeometries(geometries);
    return geometry;
  }, []);
  const circlesMeshRef = useRef<Object3D>(null);
  const instancedMeshRef = useRef<InstancedMesh>(null);

  useFrame(({ camera }) => {
    if (circlesMeshRef.current) {
      circlesMeshRef.current.quaternion.copy(camera.quaternion);
    }
  });

  useEffect(() => {
    const instancedMesh = instancedMeshRef.current;
    if (instancedMesh) {
      const startPoint = new Vector3(0, circleSize + circleSize / 2, 0);
      const endPoint = new Vector3(0, 0, 0);
      for (let i = 0; i < instanceCount; i++) {
        const lerpFactor = (0.5 + i) / instanceCount;
        const v = new Vector3().lerpVectors(startPoint, endPoint, lerpFactor);
        instancedMesh.setMatrixAt(i, new Matrix4().makeTranslation(v.x, v.y, v.z));
      }
      instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }, []);

  return (
    <object3D>
      <object3D position={[0, circleSize + circleSize / 2, 0]} ref={circlesMeshRef}>
        <mesh>
          <circleGeometry args={[circleSize * 0.5, 32]} />
          <meshBasicMaterial color={0xFFFFFF} />
        </mesh>
        <mesh position={[0, 0, 0.001]}>
          <circleGeometry args={[circleSize * innerFactor * 0.5, 32]} />
          {pfpTexture ? [
            <meshBasicMaterial color={0xD8D8D8} map={pfpTexture} key={0} />
          ] : [
            <meshBasicMaterial color={0x111111} key={1} />
          ]}
        </mesh>
      </object3D>
      {/* instanced spheres mesh from the circles to the local origin */}
      <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, instanceCount]} geometry={doubleSphereGeometry}>
        <meshBasicMaterial vertexColors />
      </instancedMesh>
    </object3D>
  );
});
MiniPlayer.displayName = 'MiniPlayer';
const MapScene = ({
  id,
  user,
  edit,
  coord,
  onMove: onMoveRaw,
  onMoveRate = 1000,
  loadState: [loadState, setLoadState],
  eventTarget,
  focused,
}: {
  id: string,
  user: any,
  edit: boolean,
  coord: Coord2D,
  onMove?: (position: Vector3) => any,
  onMoveRate?: number,
  loadState: [string | null, (newLoadState: string | null) => void],
  eventTarget: EventTarget,
  focused: boolean,
}) => {
  const router = useRouter();

  const tileLoader = useMemo(() => new TileLoader({
    id,
  }), []);
  const raycaster = useMemo(() => new Raycaster(), []);

  const [loading, setLoading] = useState(false);
  const [tileSpecs, setTileSpecs] = useState<TileSpec[]>([]);
  const [tileCandidateSpecs, setTileCandidateSpecs] = useState<TileCandidateSpec[]>([]);
  const [tileLoads, setTileLoads] = useState<TileLoad[]>([]);

  const textureLoader = useMemo(() => new TextureLoader(), []);

  const [tileMeshes, setTileMeshes] = useState<Map<TileCandidateSpec, Object3D>>(new Map());

  const [promptString, setPromptString] = useState(`${mapDefaultPrompt}\n${mapStyle}`);

  const playerControlsRef = useRef<Object3D>(null);
  const [moving, setMoving] = useState(false);

  const [highlightedCoord, setHighlightedCoord] = useState<string | null>(null);
  const [hoveredCoord, setHoveredCoord] = useState<string | null>(null);

  // debounce events
  const onMove = useMemo(() => onMoveRaw && debounce(onMoveRaw, onMoveRate), []);
  useEffect(() => {
    return () => {
      onMove && onMove.cancel();
    };
  }, []);

  // load helpers
  const ensureTiles = async (tileSpecs: TileSpec[], {
    signal,
  }: {
    signal?: AbortSignal,
  }) => {
    if (tileSpecs.length === 0) {
      setLoading(true);

      const tileSpec = {
        coord,
        json: null,
        image: null,
      } as TileSpec;
      const tileSpecs = [
        tileSpec,
      ];
      setTileSpecs(tileSpecs);
      saveTiles(tileSpecs);

      const tileLoad = {
        coord: structuredClone(tileSpec.coord),
        loading: true,
      };
      const tileLoads = [
        tileLoad,
      ];
      setTileLoads(tileLoads);
      
      const tileCandidateSpecs = makeTileCandidateSpecs(tileSpecs);
      setTileCandidateSpecs(tileCandidateSpecs);

      await ensureTile({
        tileSpec,
        tileLoad,
      }, {
        prompt: promptString,
        tileSpecs,
      }, () => {
        saveTiles(tileSpecs);
        setTileCandidateSpecs(makeTileCandidateSpecs(tileSpecs));
      });
    }
  };
  const loadTiles = async ({
    signal,
  }: {
    signal?: AbortSignal,
  } = {}) => {
    setLoading(true);

    const tileSpecs = await tileLoader.load({
      signal,
    });
    if (signal?.aborted) return;
    setTileSpecs(tileSpecs);

    // ensure all tiles are generated
    const newTileLoads: any[] = [];
    const tileLoadPromises: Promise<any>[] = [];
    for (const tileSpec of tileSpecs) {
      if (!isTileGenerated(tileSpec)) {
        const tileLoad = {
          coord: structuredClone(tileSpec.coord),
          loading: true,
        };
        newTileLoads.push(tileLoad);

        const p = ensureTile({
          tileSpec,
          tileLoad,
        }, {
          prompt: promptString,
          tileSpecs,
        }, () => {
          saveTiles(tileSpecs);
          setTileCandidateSpecs(makeTileCandidateSpecs(tileSpecs));
        });
        tileLoadPromises.push(p);
      }
    }
    setTileLoads(newTileLoads);
    
    const tileCandidateSpecs = makeTileCandidateSpecs(tileSpecs);
    setTileCandidateSpecs(tileCandidateSpecs);

    await Promise.all(tileLoadPromises);
    if (signal?.aborted) return;
  
    setLoading(false);

    return {
      tileSpecs,
      tileLoads: newTileLoads,
      tileCandidateSpecs,
    };
  };
  const saveTiles = (tileSpecs: TileSpec[], {
    signal,
  }: {
    signal?: AbortSignal,
  } = {}) => {
    (async () => {
      await tileLoader.save(tileSpecs, {
        signal,
      });
    })().catch(e => {
      console.error('save tiles error', e);
    });
  };
  const makeTileCandidateSpecs = (tileSpecs: TileSpec[]) => {
    const result: TileCandidateSpec[] = [];

    if (tileSpecs.length > 0) {
      const seenTileKeys = new Set<string>();
      for (const tileSpec of tileSpecs) {
        const coordKey = getCoordKey(tileSpec.coord);
        seenTileKeys.add(coordKey);
      }

      const seenTileCandidateKeys = new Set<string>();
      for (const tileSpec of tileSpecs) {
        if (isTileValid(tileSpec)) { // only expand out of valid tile specs
          const { coord } = tileSpec;
          const { x, z } = coord;
          for (let dz = -1; dz <= 1; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ax = x + dx;
              const az = z + dz;
              const coordKey = getCoordsKey(ax, az);
              if (!seenTileKeys.has(coordKey) && !seenTileCandidateKeys.has(coordKey)) {
                seenTileCandidateKeys.add(coordKey);
                result.push({
                  coord: {
                    x: ax,
                    z: az,
                  },
                });
              }
            }
          }
        }
      }
    } else {
      result.push({
        coord: {
          x: 0,
          z: 0,
        },
      });
    }

    return result;
  };

  // initial map load
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    (async () => {
      const result = await loadTiles({
        signal,
      });
      const tileSpecs = result?.tileSpecs;
      if (tileSpecs && !edit) {
        await ensureTiles(tileSpecs, {
          signal,
        });
      }
    })().catch(err => {
      console.warn('error loading tiles', err);
    });

    return () => {
      abortController.abort();
    };
  }, []);

  // mouse raycasting
  useFrame(({ pointer, camera }) => {
    const getIntersection = (raycaster: Raycaster) => {
      const meshes = Array.from(tileMeshes.values());
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const intersectedTile = intersects[0].object;
        return intersectedTile;
      } else {
        return null;
      }
    };

    camera.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
    const newHighlightedTile = getIntersection(raycaster);
    const highlightedTileSpec = ((newHighlightedTile as any)?.metadata?.tileSpec as TileSpec) ?? null;
    const highlightedCoord = highlightedTileSpec && getCoordKey(highlightedTileSpec.coord);
    setHighlightedCoord(highlightedCoord);

    const newHoveredTile = (() => {
      const playerControls = playerControlsRef.current;
      if (playerControls) {
        raycaster.ray.origin.copy(playerControls.position)
          .add(new Vector3(0, 1, 0));
        raycaster.ray.direction.set(0, -1, 0);
        return getIntersection(raycaster);
      } else {
        return null;
      }
    })();
    const hoveredTileSpec = ((newHoveredTile as any)?.metadata?.tileSpec as TileSpec) ?? null;
    const hoveredCoord = hoveredTileSpec && getCoordKey(hoveredTileSpec.coord);
    setHoveredCoord(hoveredCoord);
  });

  // handle doubleclick
  const { gl } = useThree();
  useEffect(() => {
    if (focused) {
      const click = (tile: TileCandidateSpec, {
        source,
      }: {
        source: 'click' | 'player',
      }) => {
        if (tileSpecs.includes(tile as TileSpec)) {
          const { coord } = tile;

          setLoadState(`Loading [${String(coord.x)}, ${String(coord.z)}]...`);

          const snappedPlayerCoord = (source === 'player' && playerControlsRef.current) ? snapCoord({
            x: playerControlsRef.current.position.x,
            z: playerControlsRef.current.position.z,
          }) : coord;
          setMapUrlCoord(snappedPlayerCoord);
          const urlString = makeLandUrl(id, coord, {
            edit,
          });
          router.push(urlString);
          // console.log('router pushed', urlString);
        } else if (tileCandidateSpecs.includes(tile)) {
          const { coord } = tile;
          const { x, z } = coord;
          // console.log('click tile candidate', coord);

          // add tile spec
          const tileSpec = {
            coord: { x, z },
            json: null,
            image: null,
          } as TileSpec;
          setTileSpecs(tileSpecs => {
            tileSpecs.push(tileSpec);
            return tileSpecs;
          });
          saveTiles(tileSpecs);

          // add tile load
          const tileLoad = {
            coord: { x, z, },
            loading: true,
          };
          setTileLoads(tileLoads => {
            tileLoads.push(tileLoad);
            return tileLoads;
          });

          // remove tile candidate spec
          setTileCandidateSpecs(makeTileCandidateSpecs(tileSpecs));

          // generate tile
          (async () => {
            await ensureTile({
              tileSpec,
              tileLoad,
            }, {
              prompt: promptString,
              tileSpecs,
            }, () => {
              saveTiles(tileSpecs);
              setTileCandidateSpecs(makeTileCandidateSpecs(tileSpecs));
            });
          })().catch((e: any) => {
            console.error('click tile candidate error', e);
          });
        }
      };
      const onDoubleClick = (e: MouseEvent) => {
        if (e.target === gl.domElement) {
          if (highlightedCoord) {
            const highlightedTile: TileCandidateSpec | null =
              tileSpecs.find(tileSpec =>
                getCoordKey(tileSpec.coord) === highlightedCoord
              ) ??
              tileCandidateSpecs.find(tileSpec =>
                getCoordKey(tileSpec.coord) === highlightedCoord
              ) ?? null;
            if (highlightedTile) {
              click(highlightedTile, {
                source: 'click',
              });
            }
          }
        }
      };
      document.addEventListener('dblclick', onDoubleClick);

      const onKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
          case ' ': {
            e.preventDefault();
            e.stopPropagation();
            if (hoveredCoord) {
              const hoveredTile: TileCandidateSpec | null =
                tileSpecs.find(tileSpec =>
                  getCoordKey(tileSpec.coord) === hoveredCoord
                ) ??
                tileCandidateSpecs.find(tileSpec =>
                  getCoordKey(tileSpec.coord) === hoveredCoord
                ) ?? null;
              if (hoveredTile) {
                click(hoveredTile, {
                  source: 'player',
                });
              }
            }
            break;
          }
          default: {
            break;
          }
        }
      };
      document.addEventListener('keydown', onKeyDown);

      return () => {
        document.removeEventListener('dblclick', onDoubleClick);
        document.removeEventListener('keydown', onKeyDown);
      };
    }
  }, [focused, hoveredCoord, highlightedCoord]);

  // generation
  useEffect(() => {
    const onClearMap = (e: any) => {
      setLoading(false);

      const newTileSpecs: TileSpec[] = [];
      setTileSpecs(newTileSpecs);
      saveTiles([]);

      setTileLoads([]);

      setTileCandidateSpecs(makeTileCandidateSpecs(newTileSpecs));
    };
    eventTarget.addEventListener('clearMap', onClearMap);

    return () => {
      eventTarget.removeEventListener('clearMap', onClearMap);
    };
  }, []);

  // controls
  const keyMap = useMemo<KeyboardControlsEntry<Controls>[]>(()=>[
    { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
    { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
    { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
    { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
    { name: Controls.shift, keys: ['ShiftLeft', 'ShiftRight'] },
    { name: Controls.jump, keys: ['Space'] },
  ], []);

  // render
  return <>
    {/* controls */}
    {!moving && <MapControls
      // camera={fakeCamera}
      target={playerControlsRef.current?.position ?? new Vector3(coord.x, -1, coord.z)}
    />}
    {/* lighting */}
    <ambientLight />
    <directionalLight position={[1, 1, 1]} />
    {/* loading box */}
    {/* <mesh position={[0, -0.01, 0]} geometry={planeGeometry}>
      <meshPhongMaterial color={loading ? 0x0000FF : 0x333333} />
    </mesh> */}
    {/* cursor mesh */}
    {/* <StoryCursor pressed={pressed} ref={storyCursorMeshRef} /> */}
    {/*
      local character keyboard controls
      // type KeyboardControlsState<T extends string = string> = { [K in T]: boolean }

      // type <KeyboardControls>Entry<T extends string = string> = {
      //   /** Name of the action */
      //   name: T
      //   /** The keys that define it, you can use either event.key, or event.code */
      //   keys: string[]
      //   /** If the event receives the keyup event, true by default */
      //   up?: boolean
      // }

      // type KeyboardControlsProps = {
      //   /** A map of named keys */
      //   map: KeyboardControlsEntry[]
      //   /** All children will be able to useKeyboardControls */
      //   children: React.ReactNode
      //   /** Optional onchange event */
      //   onChange: (name: string, pressed: boolean, state: KeyboardControlsState) => void
      //   /** Optional event source */
      //   domElement?: HTMLElement
      // }
      // };
    }
    <KeyboardControls
      map={focused ? keyMap : []}
      // onChange={(name, pressed, state) => {
      //   console.log('keyboard controls', name, pressed, state);
      // }}
    >
      <ControllableObject
        position={[coord.x, 0, coord.z]}
        onMove={onMove}
        onMoving={setMoving}
        ref={playerControlsRef}
      >
        {/* local mini player mesh */}
        <MiniPlayer
          pfpUrl={user?.preview_url ?? null}
        />
      </ControllableObject>
    </KeyboardControls>
    {/* plane mesh */}
    {(() => {
      const addMesh = (tileSpec: TileCandidateSpec) =>
        (mesh: Mesh | null) => {
          if (mesh) {
            (mesh as any).metadata = {
              tileSpec,
            };
          }

          setTileMeshes(tileMeshes => {
            if (mesh) {
              tileMeshes.set(tileSpec, mesh);
            } else {
              tileMeshes.delete(tileSpec);
            }
            return tileMeshes;
          });
        };

      return [
        ...tileSpecs.map((tileSpec) => {
          const coordKey = getCoordKey(tileSpec.coord);
          return (
            <Tile
              key={coordKey}
              tileSpec={tileSpec}
              textureLoader={textureLoader}
              tileLoads={tileLoads}
              onMeshRef={addMesh(tileSpec)}
            >
              {((highlightedCoord === coordKey && !moving) || (hoveredCoord === coordKey)) && <mesh geometry={squareGeometry}>
                <meshBasicMaterial color={0x111111} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}  />
              </mesh>}
            </Tile>
          );
        }),
        ...tileCandidateSpecs.map((tileCandidateSpec) => {
          const coordKey = getCoordKey(tileCandidateSpec.coord);
          return (
            <TileCandidate
              key={coordKey}
              tileCandidateSpec={tileCandidateSpec}
              tileLoads={tileLoads}
              onMeshRef={addMesh(tileCandidateSpec)}
            >
              {((highlightedCoord === coordKey && !moving) || (hoveredCoord === coordKey)) && <mesh geometry={squareGeometry}>
                <meshBasicMaterial color={0x111111} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
              </mesh>}
            </TileCandidate>
          )
        }),
      ];
    })()}
  </>
}

const debounce = (fn: (...args: any[]) => any, delay: number) => {
  let lastRunTime = -Infinity;
  let timeout: any = null;
  const debouncedFn = (...args: any[]) => {
    const now = Date.now();
    if (now - lastRunTime > delay) {
      lastRunTime = now;
      fn(...args);
    } else {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      const delayRemaining = delay - (now - lastRunTime);
      timeout = setTimeout(() => {
        lastRunTime = Date.now();
        fn(...args);
      }, delayRemaining);
    }
  };
  debouncedFn.cancel = () => {
    lastRunTime = -Infinity;
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  return debouncedFn;
};

function MapComponent({
  id,
  user,
  edit = false,
  coord = {
    x: 0,
    z: 0,
  },
  onMove,
}: {
  id: string,
  user: any,
  edit?: boolean,
  coord?: Coord2D,
  onMove?: (position: Vector3) => any,
  onMoveRate?: number,
}) {
  const [loadState, setLoadState] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eventTarget = useMemo(() => new EventTarget(), []);
  const [focused, setFocused] = useState(true);

  if (loadState) {
    return (
      <div className="mx-auto max-w-4xl">
        {loadState}
      </div>
    );
  }
  return (
    <div className="relative w-screen h-[calc(100vh-64px)]">
      <Canvas
        camera={{
          position: [coord.x, 1, coord.z],
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = NoToneMapping;
        }}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
        }}
        tabIndex={-1}
        ref={canvasRef}
        className="outline-none"
      >
        {/* <Suspense> */}
          {/* <Physics
            timeStep='vary'
            // debug
          > */}
            <MapScene
              id={id}
              user={user}
              edit={edit}
              coord={coord}
              onMove={onMove}
              loadState={[loadState, setLoadState]}
              eventTarget={eventTarget}
              focused={focused}
            />
          {/* </Physics> */}
        {/* </Suspense> */}
      </Canvas>
      <MapForm eventTarget={eventTarget} />
    </div>
  );
}
function Map_({
  id,
  user,
}: {
  id: string,
  user: any,
}) {
  const loadUrl = new URL(location.href);
  const query = loadUrl.searchParams;
  const edit = query.get('edit') !== null;
  const coord = getMapUrlCoord(loadUrl);
  const onMove = (position: Vector3) => {
    const coord = snapCoord({
      x: position.x,
      z: position.z,
    });
    setMapUrlCoord(coord);
  };

  return (
    <MapComponent
      id={id}
      user={user}
      edit={edit}
      coord={coord}
      onMove={onMove}
    />
  );
}
export {
  Map_ as Map,
};