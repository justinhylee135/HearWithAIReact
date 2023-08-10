import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import {
  CloudDownloadOutline,
  TrashOutline,
  MicOutline,
  PulseOutline,
} from "react-ionicons";
import languageCodes from "./languageCodes.jsx";

export default function App() {
  // Initialize States
  const [recording, setRecording] = useState(false);
  const [resultText, setResultText] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [recordingDisabled, setRecordingDisabled] = useState(false);
  const [downloadDisabled, setDownloadDisabled] = useState(true);
  const inputLanguageRef = useRef(null);
  const recognitionRef = useRef(null);
  const downloadLinkRef = useRef(null);
  const [apiKey, setApiKey] = useState("");

  // Fallback for SpeechRecognition
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition; 

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setRecording(false);
    setDownloadDisabled(false);

    // Summarize if resultText is not blank
    if (resultText) {
      if (apiKey) {
        summarize(resultText);
      } else {
        setSummaryText(
          "No API Key has been entered, enter one below language select"
        );
      }
    }
  };

  const speechToText = () => {
    if (!SpeechRecognition) {
      console.error("Your browser does not support the Web Speech API");
      setResultText(
        "Your browser does not support the Web Speech API. Switch to Google Chrome or Microsoft Edge."
      );
      return;
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = inputLanguageRef.current.value;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.continuous = true; // Keep the recognition running

      setRecording(true);

      recognitionRef.current.start();

      recognitionRef.current.onresult = (event) => {
        const speechResult =
          event.results[event.results.length - 1][0].transcript;

        // Disabled stop recording button while transcription is loading
        setRecordingDisabled(true);

        if (event.results[event.results.length - 1].isFinal) {
          setResultText((prev) => prev + speechResult + " ");

          // Enable stop recording button after resultText is updated
          setRecordingDisabled(false);
        } else {
          // Handle interim results if needed
        }
      };

      recognitionRef.current.onend = () => {
        if (recording) {
          // If the recording state is still true, restart the recognition
          recognitionRef.current.start();
        }
      };

      // In case of errors
      recognitionRef.current.onerror = (event) => {
        console.error("Recognition error:", event);
        stopRecording();
      };
    } catch (error) {
      setRecording(false);
      console.log(error);
      setResultText(
        "An error has occured. Check console log for more details."
      );
    }
  };

  const download = () => {
    const filename = "speech.txt";

    // If both resultText and summaryText exist
    if (downloadLinkRef.current && resultText) {
      // Output both transcription and summary
      if (summaryText) {
        downloadLinkRef.current.setAttribute(
          "href",
          "data:text/plain;charset=utf-8," +
            encodeURIComponent("Transcription: " + resultText) +
            encodeURIComponent("Summary: " + summaryText)
        );
      } else {
        // Output just the resultText
        downloadLinkRef.current.setAttribute(
          "href",
          "data:text/plain;charset=utf-8," +
            encodeURIComponent("Transcription: " + resultText)
        );
        // Output error on summary textbox
        setSummaryText(
          "No summary was available so only the transcription was downloaded."
        );
      }

      downloadLinkRef.current.setAttribute("download", filename);
      downloadLinkRef.current.click();
    } else {
      // In case download is not set up or resultText is empty
      setResultText("The transcription is empty, please start a recording.");
    }
  };

  const clear = () => {
    setResultText("");
    setSummaryText("");
    setDownloadDisabled(true);
  };

  const summarize = async (text) => {
    setSummaryText("Loading...");
    const apiUrl = "https://api.openai.com/v1/chat/completions";
  
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: "Summarize: " + text,
            },
          ],
        }),
      });
  
      const data = await response.json();
  
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const summaryText = data.choices[0].message.content.trim();
        setSummaryText(summaryText);
        setDownloadDisabled(false);
      } else {
        throw new Error("Unexpected response structure from OpenAI API");
      }
    } catch (error) {
      setSummaryText(
        "An error has occurred. Check that your API Key is valid. Read console logs for more error details."
      );
      console.error(error);
    }
  };
  
  return (
    <div className="container">
      {/* Header */}
      <p className="heading">Hear With AI</p>
      <div className="options">
        <div className="language">
          <p>Select Language Below</p>
          <select
            ref={inputLanguageRef}
            name="input-language"
            id="language"
            defaultValue="en-US"
          >
            {Object.entries(languageCodes).map(([lang, code]) => (
              <option key={code} value={code}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* API Key Input */}
      <div className="api-key-input">
        <label htmlFor="apiKey">Enter your OpenAI API Key:</label>
        <input
          type="text"
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your API key here"
        />
      </div>

      {/* Seperator */}
      <div className="line"></div>

      {/* Record Input */}
      <button
        className="btn record"
        onClick={recording ? stopRecording : speechToText}
        disabled={recordingDisabled}
      >
        <div className="icon">
          {recording ? (
            <PulseOutline color={"#00000"} height="30px" width="30px" />
          ) : (
            <MicOutline color={"#00000"} height="30px" width="30px" />
          )}
        </div>
        <p>{recording ? "Stop Listening" : "Record Speech"}</p>
      </button>

      <p className="heading">Transcription :</p>
      <div
        className="result"
        spellCheck="false"
        placeholder="Transcription Will Be Shown Here"
      >
        {resultText}
        <p className="interim"></p>
      </div>

      {/* Summarized Output Box */}
      <p className="heading">AI Summarization :</p>
      <div
        className="summarized"
        spellCheck="false"
        placeholder="GPT Summarization Will Be Shown Here"
      >
        {summaryText}
        <p className="interim"></p>
      </div>

      {/* Buttons */}
      <div className="buttons">
        <button className="btn clear" onClick={clear}>
          <TrashOutline color={"#00000"} height="30px" width="30px" />
          <p>Clear</p>
        </button>
        <button
          className="btn download"
          onClick={download}
          disabled={downloadDisabled}
        >
          <CloudDownloadOutline color={"#00000"} height="30px" width="30px" />
          <p>Download</p>
          <a ref={downloadLinkRef} style={{ display: "none" }}></a>
        </button>
      </div>
    </div>
  );
}
