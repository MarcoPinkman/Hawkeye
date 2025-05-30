"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Pencil,
  Trash2,
  Camera,
  ArrowLeft,
  Plus,
  ArrowRight,
  AlertTriangle,
  Settings as SettingsIcon,
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import EventLogs from "./event-logs/ui";

type EventToDetect = {
  code: string;
  description: string;
  guidelines: string;
};

type AppState = {
  step: number;
  previewUrl: string;
  rtspUrl: string;
  eventsToDetect: EventToDetect[];
  streamContext: string;
  chunkDuration: number;
  outputDir: string;
  llamaModel: string;
  baseUrl: string;
};

export default function Home() {
  const initialEvents: EventToDetect[] = [
    {
      code: "叉车事故监测",
      description: 
        "各类生产场景下的叉车运行视频，注意观察是否有事故发生",
      guidelines:
        "注意探测画面中是否事故发生，包括但不限于叉车翘翻、人员伤害等情况",
    },
    {
      code: "倒地监测",
      description:
        "监测人员倒地情况",
      guidelines:
        "注意观察画面中的人员是否躺倒在地，包括突然倒地、碰撞倒地、缓慢倒地等情况",
    },
    {
      code: "进球时刻",
      description:
        "监测足球进球情况",
      guidelines:
        "注意观察画面中的足球运动，当且仅当足球进入球门时触发事件",
    },
  ];

  const [state, setState] = useState<AppState>({
    step: 1,
    previewUrl: "http://localhost:1984/stream.html?src=hackathon",
    rtspUrl: "rtsp://localhost:8554/hackathon",
    eventsToDetect: initialEvents,
    streamContext:
      "摄像头所拍摄画面，从视频中每1秒抽取1帧组成。",
    chunkDuration: 5,
    outputDir: "/Users/wenjie/llamacon-hackathon-2025-sf-main/localdata/video_chunks/",
    llamaModel: "qwen-vl-max",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  });

  const [newEvent, setNewEvent] = useState<EventToDetect>({
    code: "",
    description: "",
    guidelines: "",
  });

  const [editingEvent, setEditingEvent] = useState<{
    index: number;
    event: EventToDetect;
  } | null>(null);

  const [showConfig, setShowConfig] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const detectionShouldBeActive = useRef(false);

  // State for the video modal (lifted from EventLogs)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    let toastTimer: NodeJS.Timeout;

    if (statusMessage) {
      setToastVisible(true);

      toastTimer = setTimeout(() => {
        setToastVisible(false);
      }, 5000);
    }

    return () => {
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, [statusMessage]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setStatusMessage(message);
      setToastType(type);
    },
    []
  );

  const startDetection = useCallback(async () => {
    try {
      showToast("监测程序启动中...", "success");

      const requestBody = {
        model: state.llamaModel,
        base_url: state.baseUrl,
        rtsp_url: state.rtspUrl,
        chunk_duration: state.chunkDuration,
        output_dir: state.outputDir,
        context: state.streamContext,
        events: state.eventsToDetect.map((event) => ({
          event_code: event.code,
          event_description: event.description,
          detection_guidelines: event.guidelines,
        })),
      };

      const response = await fetch("http://localhost:8000/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        setIsDetecting(true);
        showToast("监测程序启动成功", "success");
      } else {
        const errorData = await response.json();
        showToast(
          `监测程序启动失败: ${
            errorData.detail || response.statusText
          }`,
          "error"
        );
      }
    } catch (error) {
      showToast(
        `监测程序启动失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
    }
  }, [state, showToast, setIsDetecting]);

  const stopDetection = useCallback(async () => {
    try {
      showToast("监测程序关闭中...", "success");
      const response = await fetch("http://localhost:8000/stop", {
        method: "POST",
      });

      if (response.ok) {
        setIsDetecting(false);
        showToast("监测程序关闭成功", "success");
      } else {
        const errorData = await response.json();
        showToast(
          `监测程序关闭失败: ${
            errorData.detail || response.statusText
          }`,
          "error"
        );
      }
    } catch (error) {
      console.error("监测程序关闭失败:", error);
      setIsDetecting(false);
    }
  }, [showToast, setIsDetecting]);

  const restartDetection = useCallback(async () => {
    try {
      await stopDetection();
      setTimeout(async () => {
        await startDetection();
      }, 1000);
    } catch (error) {
      showToast(
        `重启监测程序失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
    }
  }, [stopDetection, startDetection, showToast]);

  useEffect(() => {
    if (state.step === 5) {
      if (!detectionShouldBeActive.current) {
        console.log("Effect: Entering Step 5, starting detection.");
        startDetection();
        detectionShouldBeActive.current = true;
      }
    } else {
      if (detectionShouldBeActive.current) {
        console.log("Effect: Leaving Step 5, stopping detection.");
        stopDetection();
        detectionShouldBeActive.current = false;
      }
    }

    return () => {
      if (detectionShouldBeActive.current) {
        console.log(
          "Effect Cleanup: Unmounting on Step 5, stopping detection."
        );
        stopDetection();
        detectionShouldBeActive.current = false;
      }
    };
  }, [state.step, startDetection, stopDetection]);

  const nextStep = () => {
    if (state.step === 4) {
      detectionShouldBeActive.current = true;
      startDetection();
    }
    setState({ ...state, step: state.step + 1 });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep();
  };

  const handleLlamaSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep();
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEvent.code && newEvent.description && newEvent.guidelines) {
      if (editingEvent !== null) {
        const updatedEvents = [...state.eventsToDetect];
        updatedEvents[editingEvent.index] = { ...newEvent };
        setState({
          ...state,
          eventsToDetect: updatedEvents,
        });
        setEditingEvent(null);
      } else {
        setState({
          ...state,
          eventsToDetect: [...state.eventsToDetect, { ...newEvent }],
        });
      }
      setNewEvent({ code: "", description: "", guidelines: "" });
    }
  };

  const handleDeleteEvent = (index: number) => {
    const updatedEvents = state.eventsToDetect.filter((_, i) => i !== index);
    setState({
      ...state,
      eventsToDetect: updatedEvents,
    });
    if (editingEvent?.index === index) {
      cancelEdit();
    }
  };

  const handleEditEvent = (index: number) => {
    setEditingEvent({
      index,
      event: state.eventsToDetect[index],
    });
    setNewEvent(state.eventsToDetect[index]);
  };

  const cancelEdit = () => {
    setEditingEvent(null);
    setNewEvent({ code: "", description: "", guidelines: "" });
  };

  // Function to open the video modal (passed to EventLogs)
  const handleOpenVideo = (url: string) => {
    setModalVideoUrl(url);
    setIsModalOpen(true);
  };

  // Function to close the video modal
  const closeModal = () => {
    setIsModalOpen(false);
    setModalVideoUrl(null);
  };

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return (
          <div className="flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto p-8 min-h-[calc(100vh-2rem)]">
            <div className="rounded-full overflow-hidden w-64 h-64 relative mb-6">
              <Image
                src="/logo.png"
                alt="Llama CCTV Operator"
                fill
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
            <h1 className="text-4xl font-bold text-center text-white">
              鹰眼
            </h1>
            <p className="text-xl text-center mb-6 text-gray-300">
              智能视频监控助手
            </p>
            <p className="text-center text-gray-400 mb-8 max-w-lg">
              Powered by Qwen-VL-MAX.
            </p>
            <button
              onClick={nextStep}
              className="px-8 py-4 bg-indigo-800 text-white rounded-full hover:bg-indigo-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2 focus:ring-offset-black"
            >
              Get Started
            </button>
          </div>
        );

      case 2:
        return (
          <div className="max-w-3xl mx-auto p-8 min-h-[calc(100vh-2rem)] flex flex-col justify-center">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-800/30 rounded-full">
                  <SettingsIcon size={28} className="text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold text-white">
                  Qwen API 设置
                </h2>
              </div>

              <p className="text-gray-400 mb-8">
                配置千问人工智能模型用于视频事件监测
              </p>

              <form onSubmit={handleLlamaSetupSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="block text-sm font-medium text-gray-300 md:col-span-1">
                    模型型号
                  </label>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={state.llamaModel}
                      onChange={(e) =>
                        setState({ ...state, llamaModel: e.target.value })
                      }
                      className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                      placeholder="qwen-vl-max"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="block text-sm font-medium text-gray-300 md:col-span-1">
                    API 地址
                  </label>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={state.baseUrl}
                      onChange={(e) =>
                        setState({ ...state, baseUrl: e.target.value })
                      }
                      className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                      placeholder="https://api.llama.com/compat/v1/"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setState({ ...state, step: state.step - 1 })}
                    className="px-4 py-2 flex items-center gap-2 text-gray-300 hover:text-white transition-colors focus:outline-none"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-800 text-white rounded-lg hover:bg-indigo-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-700"
                  >
                    Continue
                  </button>
                </div>
              </form>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="max-w-3xl mx-auto p-8 min-h-[calc(100vh-2rem)] flex flex-col justify-center">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-800/30 rounded-full">
                  <Camera size={28} className="text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold text-white">视频源设置</h2>
              </div>

              <form onSubmit={handleUrlSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="block text-sm font-medium text-gray-300 md:col-span-1">
                    预览视频 URL
                  </label>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={state.previewUrl}
                      onChange={(e) =>
                        setState({ ...state, previewUrl: e.target.value })
                      }
                      className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                      placeholder="https://example.com/preview"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="block text-sm font-medium text-gray-300 md:col-span-1">
                    RTSP URL
                  </label>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={state.rtspUrl}
                      onChange={(e) =>
                        setState({ ...state, rtspUrl: e.target.value })
                      }
                      className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                      placeholder="rtsp://camera.example.com/stream"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="block text-sm font-medium text-gray-300 md:col-span-1">
                    视频分块时长 (s)
                  </label>
                  <div className="md:col-span-3">
                    <input
                      type="number"
                      value={state.chunkDuration}
                      onChange={(e) =>
                        setState({
                          ...state,
                          chunkDuration: parseInt(e.target.value) || 5,
                        })
                      }
                      className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                      placeholder="5"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="block text-sm font-medium text-gray-300 md:col-span-1">
                    缓存输出目录
                  </label>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={state.outputDir}
                      onChange={(e) =>
                        setState({ ...state, outputDir: e.target.value })
                      }
                      className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                      placeholder="/Users/torayeff/lab/localdata/video_chunks/"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setState({ ...state, step: state.step - 1 })}
                    className="px-4 py-2 flex items-center gap-2 text-gray-300 hover:text-white transition-colors focus:outline-none"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-800 text-white rounded-lg hover:bg-indigo-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-700"
                  >
                    Continue
                  </button>
                </div>
              </form>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="max-w-4xl mx-auto p-8 min-h-[calc(100vh-2rem)] flex flex-col">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-800/30 rounded-full">
                  <Plus size={28} className="text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold text-white">
                  配置待监测事件
                </h2>
              </div>

              <div className="mb-8 border border-gray-800 rounded-xl p-6 bg-gray-900/30">
                <h3 className="text-xl font-semibold mb-4 text-white">
                  视频流信息
                </h3>
                <p className="text-gray-400 mb-4">
                  提供有关视频流内容的背景信息以帮助检测
                </p>
                <textarea
                  value={state.streamContext}
                  onChange={(e) =>
                    setState({ ...state, streamContext: e.target.value })
                  }
                  className="w-full p-4 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                  placeholder="Describe the general environment, camera location, or specific conditions of this stream..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    新增监测事件
                  </h3>
                  <form
                    onSubmit={handleAddEvent}
                    className="space-y-4 p-6 border border-gray-800 rounded-xl bg-gray-900/50"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        事件简称
                      </label>
                      <input
                        type="text"
                        value={newEvent.code}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, code: e.target.value })
                        }
                        className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                        placeholder="例：倒地监测"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        事件描述
                      </label>
                      <input
                        type="text"
                        value={newEvent.description}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            description: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                        placeholder="例：监测人员倒地情况"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        监测事件详细描述（进一步帮助大模型理解具体的监测内容）
                      </label>
                      <textarea
                        value={newEvent.guidelines}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            guidelines: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                        placeholder="例：注意观察画面中的人员是否躺倒在地，包括突然倒地、碰撞倒地、缓慢倒地等情况"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="px-4 py-3 bg-indigo-800 text-white rounded-lg hover:bg-indigo-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-700"
                      >
                        {editingEvent !== null ? "Update Event" : "新增监测事件"}
                      </button>
                      {editingEvent !== null && (
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div>
                  {state.eventsToDetect.length > 0 ? (
                    <div>
                      <h3 className="text-xl font-semibold mb-4 text-white">
                        待监测事件
                      </h3>
                      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2">
                        {state.eventsToDetect.map((event, index) => (
                          <div
                            key={index}
                            className="p-4 border border-gray-800 rounded-xl bg-gray-900/50 backdrop-blur-sm"
                          >
                            <div className="font-medium text-white">
                              {event.code}
                            </div>
                            <div className="text-sm text-gray-300">
                              {event.description}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleEditEvent(index)}
                                className="p-1.5 bg-indigo-800 text-white rounded hover:bg-indigo-900 transition-colors"
                                aria-label="Edit event"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(index)}
                                className="p-1.5 bg-red-800 text-white rounded hover:bg-red-900 transition-colors"
                                aria-label="Delete event"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 border border-gray-800 rounded-xl bg-gray-900/20">
                      <AlertTriangle
                        size={40}
                        className="text-amber-500 mb-4"
                      />
                      <p className="text-center text-gray-400">
                        尚未添加任何监测事件，请至少添加一个事件
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setState({ ...state, step: state.step - 1 })}
                  className="px-4 py-2 flex items-center gap-2 text-gray-300 hover:text-white transition-colors focus:outline-none"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={state.eventsToDetect.length === 0}
                  className={`px-5 py-3 bg-indigo-800 text-white rounded-lg flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-700 ${
                    state.eventsToDetect.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-indigo-900"
                  }`}
                >
                  开始监测
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <>
            <div className="max-w-7xl mx-auto p-6 h-screen flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white">
                  鹰眼 🦅 视频监测
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    {showConfig ? <X size={18} /> : <SettingsIcon size={18} />}
                    {showConfig ? "返回" : "系统设置"}
                  </button>
                </div>
              </div>

              {statusMessage && toastVisible && (
                <div
                  className={`fixed top-6 right-6 p-3 rounded-lg text-white shadow-lg max-w-md z-50 flex items-center gap-2 transform transition-all duration-300 ${
                    toastType === "error"
                      ? "bg-red-900/80 border border-red-800"
                      : "bg-green-900/80 border border-green-800"
                  } ${
                    toastVisible
                      ? "translate-y-0 opacity-100"
                      : "-translate-y-4 opacity-0"
                  }`}
                >
                  {toastType === "error" ? (
                    <AlertCircle size={20} className="text-red-300" />
                  ) : (
                    <CheckCircle size={20} className="text-green-300" />
                  )}
                  <span>{statusMessage}</span>
                  <button
                    onClick={() => setToastVisible(false)}
                    className="ml-auto p-1 rounded-full hover:bg-black/20"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 flex-grow overflow-hidden">
                <div className="lg:col-span-3 flex flex-col h-full overflow-hidden">
                  <div className="flex-grow rounded-2xl overflow-hidden border border-gray-800 flex-shrink-0 relative">
                    <iframe
                      src={state.previewUrl}
                      className="absolute inset-0 w-full h-full"
                      title="Camera Preview"
                      allow="autoplay; fullscreen"
                    ></iframe>
                  </div>
                  <div className="p-4 border border-gray-800 rounded-xl bg-gray-900/50 backdrop-blur-sm mt-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">
                        视频信息
                      </h3>
                      {isDetecting && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-900/50 border border-green-800 rounded-lg text-sm text-green-300">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          <span>Detection in progress</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 mt-2">
                      RTSP URL: {state.rtspUrl}
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-2 h-full overflow-hidden flex flex-col">
                  {showConfig ? (
                    <div className="p-4 border border-gray-800 rounded-xl bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full flex flex-col">
                      <h3 className="text-lg font-semibold mb-3 text-white">
                        系统设置
                      </h3>

                      <div className="space-y-4 flex-grow">
                        <div>
                          <h4 className="text-md font-medium mb-3 text-white">
                            大模型 API 设置
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium mb-1 text-gray-300">
                                模型型号
                              </label>
                              <input
                                type="text"
                                value={state.llamaModel}
                                onChange={(e) =>
                                  setState({
                                    ...state,
                                    llamaModel: e.target.value,
                                  })
                                }
                                className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                                placeholder="qwen-vl-max"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1 text-gray-300">
                                模型 URL
                              </label>
                              <input
                                type="text"
                                value={state.baseUrl}
                                onChange={(e) =>
                                  setState({
                                    ...state,
                                    baseUrl: e.target.value,
                                  })
                                }
                                className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                                placeholder="https://api.llama.com/compat/v1/"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <h4 className="text-md font-medium mb-3 text-white">
                            视频流 URLs
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium mb-1 text-gray-300">
                                预览 URL
                              </label>
                              <input
                                type="text"
                                value={state.previewUrl}
                                onChange={(e) =>
                                  setState({
                                    ...state,
                                    previewUrl: e.target.value,
                                  })
                                }
                                className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                                placeholder="http://localhost:1984/stream.html?src=hackathon"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1 text-gray-300">
                                RTSP URL
                              </label>
                              <input
                                type="text"
                                value={state.rtspUrl}
                                onChange={(e) =>
                                  setState({
                                    ...state,
                                    rtspUrl: e.target.value,
                                  })
                                }
                                className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                                placeholder="rtsp://localhost:8554/hackathon"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1 text-gray-300">
                                视频分块时长 (s)
                              </label>
                              <input
                                type="number"
                                value={state.chunkDuration}
                                onChange={(e) =>
                                  setState({
                                    ...state,
                                    chunkDuration:
                                      parseInt(e.target.value) || 5,
                                  })
                                }
                                className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                                placeholder="5"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1 text-gray-300">
                                缓存输出目录
                              </label>
                              <input
                                type="text"
                                value={state.outputDir}
                                onChange={(e) =>
                                  setState({
                                    ...state,
                                    outputDir: e.target.value,
                                  })
                                }
                                className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                                placeholder="/Users/torayeff/lab/localdata/video_chunks/"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <h4 className="text-md font-medium mb-3 text-white">
                            视频流信息
                          </h4>
                          <textarea
                            value={state.streamContext}
                            onChange={(e) =>
                              setState({
                                ...state,
                                streamContext: e.target.value,
                              })
                            }
                            className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                            placeholder="Describe the environment..."
                            rows={3}
                          />
                        </div>

                        {state.eventsToDetect.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <h4 className="text-md font-medium mb-3 text-white">
                              已配置事件
                            </h4>
                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                              {state.eventsToDetect.map((event, index) => (
                                <div
                                  key={index}
                                  className="p-2 border border-gray-800 rounded-lg bg-gray-900 flex justify-between items-center"
                                >
                                  <div>
                                    <div className="font-medium text-sm text-white">
                                      {event.code}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {event.description}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleEditEvent(index)}
                                      className="p-1 bg-indigo-800 text-white rounded hover:bg-indigo-900 transition-colors"
                                      aria-label="Edit event"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEvent(index)}
                                      className="p-1 bg-red-800 text-white rounded hover:bg-red-900 transition-colors"
                                      aria-label="Delete event"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <h4 className="text-md font-medium mb-3 text-white">
                            {editingEvent !== null
                              ? "编辑事件"
                              : "新增事件"}
                          </h4>
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={newEvent.code}
                              onChange={(e) =>
                                setNewEvent({
                                  ...newEvent,
                                  code: e.target.value,
                                })
                              }
                              className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                              placeholder="事件简称"
                            />
                            <input
                              type="text"
                              value={newEvent.description}
                              onChange={(e) =>
                                setNewEvent({
                                  ...newEvent,
                                  description: e.target.value,
                                })
                              }
                              className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                              placeholder="事件描述"
                            />
                            <textarea
                              value={newEvent.guidelines}
                              onChange={(e) =>
                                setNewEvent({
                                  ...newEvent,
                                  guidelines: e.target.value,
                                })
                              }
                              className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                              placeholder="监测事件详细描述"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (newEvent.code && newEvent.description) {
                                    if (editingEvent !== null) {
                                      const updatedEvents = [
                                        ...state.eventsToDetect,
                                      ];
                                      updatedEvents[editingEvent.index] = {
                                        ...newEvent,
                                      };
                                      setState({
                                        ...state,
                                        eventsToDetect: updatedEvents,
                                      });
                                      setEditingEvent(null);
                                    } else {
                                      setState({
                                        ...state,
                                        eventsToDetect: [
                                          ...state.eventsToDetect,
                                          { ...newEvent },
                                        ],
                                      });
                                    }
                                    setNewEvent({
                                      code: "",
                                      description: "",
                                      guidelines: "",
                                    });
                                  }
                                }}
                                className="px-3 py-1.5 bg-indigo-800 text-white text-sm rounded hover:bg-indigo-900 transition-colors"
                              >
                                {editingEvent !== null ? "更新" : "新增"}
                              </button>
                              {editingEvent !== null && (
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 transition-colors"
                                >
                                  取消
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-700 flex-shrink-0 space-y-3">
                        <button
                          onClick={restartDetection}
                          className="w-full py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <RefreshCw size={16} />
                          重启以启用新设置
                        </button>

                        {isDetecting && (
                          <button
                            onClick={stopDetection}
                            className="w-full py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                          >
                            <X size={16} />
                            Stop Detection
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border border-gray-800 rounded-xl bg-gray-900/50 backdrop-blur-sm h-full flex flex-col overflow-hidden">
                      <h3 className="text-lg font-semibold mb-3 text-white flex-shrink-0">
                        已监测到的事件
                      </h3>
                      <div className="overflow-hidden flex-grow">
                        <EventLogs onOpenVideo={handleOpenVideo} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isModalOpen && modalVideoUrl && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="relative bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl aspect-video">
                  <button
                    onClick={closeModal}
                    className="absolute -top-2 -right-2 z-10 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 transition-colors"
                    aria-label="Close video modal"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <video
                    key={modalVideoUrl}
                    className="w-full h-full rounded-lg"
                    src={modalVideoUrl}
                    controls
                    autoPlay
                    onError={(e) => {
                      console.error("Video player error:", e);
                      showToast("Error loading video.", "error");
                      closeModal();
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div
                  className="absolute inset-0 -z-10"
                  onClick={closeModal}
                ></div>
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      {renderStep()}

      {/* Video Modal - Rendered at the top level, outside renderStep */}
      {isModalOpen && modalVideoUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl aspect-video">
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute -top-2 -right-2 z-10 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 transition-colors"
              aria-label="Close video modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Video Player */}
            <video
              key={modalVideoUrl} // Add key to force re-render on URL change
              className="w-full h-full rounded-lg"
              src={modalVideoUrl}
              controls
              autoPlay
              onError={(e) => {
                console.error("Video player error:", e);
                showToast("Error loading video.", "error"); // Use showToast for consistency
                closeModal(); // Close modal on video error
              }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
          {/* Click outside to close */}
          <div className="absolute inset-0 -z-10" onClick={closeModal}></div>
        </div>
      )}
    </main>
  );
}
