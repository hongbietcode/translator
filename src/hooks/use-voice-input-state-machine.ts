import { useReducer, useCallback } from "react";

export type VoiceInputPhase =
  | "idle"
  | "listening"
  | "finalizing"
  | "correcting"
  | "inserting"
  | "done"
  | "error";

export type VoiceInputState =
  | { phase: "idle" }
  | { phase: "listening"; transcript: string; provisional: string }
  | { phase: "finalizing"; transcript: string }
  | { phase: "correcting"; transcript: string }
  | { phase: "inserting"; text: string }
  | { phase: "done"; text: string }
  | { phase: "error"; message: string; canRetry: boolean };

export type VoiceInputAction =
  | { type: "START_LISTENING" }
  | { type: "UPDATE_TRANSCRIPT"; transcript: string; provisional: string }
  | { type: "STOP_LISTENING" }
  | { type: "TRANSCRIPT_READY"; transcript: string }
  | { type: "START_CORRECTING"; transcript: string }
  | { type: "CORRECTION_DONE"; text: string }
  | { type: "START_INSERTING"; text: string }
  | { type: "INSERTION_DONE"; text: string }
  | { type: "ERROR"; message: string; canRetry: boolean }
  | { type: "RESET" };

const INITIAL_STATE: VoiceInputState = { phase: "idle" };

function reducer(
  state: VoiceInputState,
  action: VoiceInputAction,
): VoiceInputState {
  switch (action.type) {
    case "START_LISTENING":
      return { phase: "listening", transcript: "", provisional: "" };

    case "UPDATE_TRANSCRIPT":
      if (state.phase !== "listening") return state;
      return {
        phase: "listening",
        transcript: action.transcript,
        provisional: action.provisional,
      };

    case "STOP_LISTENING":
      if (state.phase !== "listening") return state;
      return { phase: "finalizing", transcript: state.transcript };

    case "TRANSCRIPT_READY":
      return { phase: "finalizing", transcript: action.transcript };

    case "START_CORRECTING":
      return { phase: "correcting", transcript: action.transcript };

    case "CORRECTION_DONE":
      return { phase: "inserting", text: action.text };

    case "START_INSERTING":
      return { phase: "inserting", text: action.text };

    case "INSERTION_DONE":
      return { phase: "done", text: action.text };

    case "ERROR":
      return {
        phase: "error",
        message: action.message,
        canRetry: action.canRetry,
      };

    case "RESET":
      return INITIAL_STATE;

    default:
      return state;
  }
}

export function useVoiceInputStateMachine() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const startListening = useCallback(
    () => dispatch({ type: "START_LISTENING" }),
    [],
  );

  const updateTranscript = useCallback(
    (transcript: string, provisional: string) =>
      dispatch({ type: "UPDATE_TRANSCRIPT", transcript, provisional }),
    [],
  );

  const stopListening = useCallback(
    () => dispatch({ type: "STOP_LISTENING" }),
    [],
  );

  const transcriptReady = useCallback(
    (transcript: string) =>
      dispatch({ type: "TRANSCRIPT_READY", transcript }),
    [],
  );

  const startCorrecting = useCallback(
    (transcript: string) =>
      dispatch({ type: "START_CORRECTING", transcript }),
    [],
  );

  const correctionDone = useCallback(
    (text: string) => dispatch({ type: "CORRECTION_DONE", text }),
    [],
  );

  const startInserting = useCallback(
    (text: string) => dispatch({ type: "START_INSERTING", text }),
    [],
  );

  const insertionDone = useCallback(
    (text: string) => dispatch({ type: "INSERTION_DONE", text }),
    [],
  );

  const setError = useCallback(
    (message: string, canRetry: boolean) =>
      dispatch({ type: "ERROR", message, canRetry }),
    [],
  );

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    state,
    dispatch,
    startListening,
    updateTranscript,
    stopListening,
    transcriptReady,
    startCorrecting,
    correctionDone,
    startInserting,
    insertionDone,
    setError,
    reset,
  };
}
