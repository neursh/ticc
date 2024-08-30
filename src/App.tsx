import { hookstate, State, useHookstate } from "@hookstate/core";
import { motion } from "framer-motion";
import { createXRStore, useXR, XR, XRDomOverlay } from "@react-three/xr";
import { Suspense, useEffect, useRef } from "react";
import { Canvas, useThree, MeshProps } from "@react-three/fiber";
import { useVideoTexture } from "@react-three/drei";
import { Vector3 } from "three";
import { motion as motion3d } from "framer-motion-3d";

enum ArCheck { waiting, notSupported, supported }

const readyGlobal = hookstate(false);
const arCheckGlobal = hookstate(ArCheck.waiting);
const videoUrlGlobal = hookstate("");
const arStore = createXRStore();

export default function App() {
  return (
    <>
    <ViewSpace />
    <PreUI />
    </>
  )
}

function PreUI() {
  const arCheck = useHookstate(arCheckGlobal);
  const fileDialog = useRef<HTMLInputElement>(null);
  const videoUrl = useHookstate(videoUrlGlobal);
  const videoName = useHookstate("No video file selected");

  function checkArXr() {
    if (navigator.xr) {
      navigator.xr.isSessionSupported("immersive-ar")
      .then((value) => {
        if (value) {
          arCheck.set(ArCheck.supported);
        } else {
          arCheck.set(ArCheck.notSupported);
        }
      })
      .catch(() => {
        arCheck.set(ArCheck.notSupported);
      });
    } else {
      arCheck.set(ArCheck.notSupported);
    }
  }

  async function createVideoObjectAndStart(e: Event) {
    if (e.target) {
      if ((e.target as HTMLInputElement).files) {
        const file = (e.target! as HTMLInputElement).files![0];
        if (file) {
          const buffer = await file.arrayBuffer();
          const blob = new Blob([buffer], { type: file.type });
          videoUrl.set(URL.createObjectURL(blob));
          videoName.set(file.name);
        }
      }
    }
  }

  useEffect(() => {
    checkArXr();

    fileDialog.current!.addEventListener("change", createVideoObjectAndStart);
    const fileDispose = () => fileDialog.current!.removeEventListener("change", createVideoObjectAndStart);

    return () => {
      fileDispose();
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-dvh w-screen justify-center items-center pl-8 pr-8">
      <h2 className="text-2xl">
        Goofy ahh AR video
      </h2>
      <p>
        I've got no idea why I chose this name.
      </p>
      <input ref={fileDialog} className="w-0 h-0" type="file" accept="video/*" />
      <motion.button
      className={`rounded-full pl-3 pr-3 pb-1 pt-1 mt-3 mb-2 text-base bg-black text-white font-semibold ${arCheck.get() === ArCheck.supported ? "cursor-pointer" : "cursor-default"}`}
      initial={{ opacity: 1 }}
      animate={{ opacity: arCheck.get() === ArCheck.supported ? 1 : 0.3 }}
      onClick={
        arCheck.get() === ArCheck.supported ?
        () => {
          fileDialog.current?.click();
        } :
        () => {}
      }>
        Select video
      </motion.button>
      <p>
        {videoName.get()}
      </p>
      <motion.button
      className={`rounded-full pl-3 pr-3 pb-1 pt-1 mt-3 mb-6 text-base bg-black text-white font-semibold ${arCheck.get() === ArCheck.supported && videoName.get() !== "No video file selected" ? "cursor-pointer" : "cursor-default"}`}
      initial={{ opacity: 1 }}
      animate={{ opacity: arCheck.get() === ArCheck.supported && videoName.get() !== "No video file selected" ? 1 : 0.3 }}
      onClick={
        arCheck.get() === ArCheck.supported && videoName.get() !== "No video file selected" ?
        () => arStore.enterAR() :
        () => {}
      }>
        Start AR
      </motion.button>
      <p className="text-center">
      {
        arCheck.get() === ArCheck.notSupported && "Your browser does NOT support AR 😭🙏💀"
      }
      {
        arCheck.get() === ArCheck.supported && "Your browser supports AR, you're good cuh 😁👍"
      }
      {
        arCheck.get() === ArCheck.waiting && "I'm checking your browser if AR support is available 🤑🎰"
      }
      </p>
    </div>
  );
}

function ViewSpace() {
  const ready = useHookstate(readyGlobal);
  return (
    <Canvas style={{ height: 1, width: 1, position: "absolute" }}>
      <XR store={arStore}>
        <XRDomOverlay>
        {
          !ready.get() &&
          <div className="w-screen h-dvh flex flex-col justify-center items-center pl-8 pr-8">
            <div className="flex flex-col justify-center items-center backdrop-blur-lg rounded-lg">
              <button className="rounded-full pl-3 pr-3 pb-1 pt-1 mb-2 text-base bg-black text-white pb-4" onClick={() => ready.set(true)}>
              Place it here
              </button>
              <p className="text-center text-xs pb-4">
                💡 Pro tip: The environment must be a well-lit area. Move the camera around to let the device scan, then place it on a rough, distinct terrain in the environment for better positioning!
              </p>
            </div>
          </div>
        }
        </XRDomOverlay>
        <YayVideo ready={ready} />
      </XR>
    </Canvas>
  );
}

function YayVideo(props: { ready: State<boolean, object> }) {
  const videoUrl = useHookstate(videoUrlGlobal);
  const cube = useRef<MeshProps>(null);

  const three = useThree();

  useEffect(() => {
    if (props.ready.get()) {
      const direction = new Vector3(0, 0, -1).applyQuaternion(three.camera.quaternion);

      const distance = 0.4;
      const newPosition = three.camera.position.clone().add(direction.multiplyScalar(distance));
      
      (cube.current?.position as Vector3).copy(newPosition);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ props.ready ]);

  const session = useXR(xr => xr.session);

  function xrEnd() {
    props.ready.set(false);
  }

  useEffect(() => {
    session?.addEventListener("end", xrEnd);

    return () => {
      session?.removeEventListener("end", xrEnd);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  
  return (
    <motion3d.mesh
    ref={cube}
    scale={0.25}
    visible={props.ready.get()}
    initial={{
      rotateY: 0
    }}
    animate={{
      rotateY: Math.PI
    }}
    transition={{
      duration: 5,
      repeat: Infinity,
      repeatType: "loop",
      ease: [1, 1, 0, 0]
    }}>
      <boxGeometry />
      <Suspense fallback={<meshBasicMaterial wireframe />}>
      {
        props.ready.get() &&
        <VideoMaterial url={videoUrl.get()} />
      }
      </Suspense>
    </motion3d.mesh>
  );
}

function VideoMaterial(props: { url: string }) {
  const texture = useVideoTexture(props.url, { autoplay: true, muted: false, loop: true });

  useEffect(() => () => {
    texture.image.pause();
    texture.dispose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <meshBasicMaterial map={texture} toneMapped={false} />
}