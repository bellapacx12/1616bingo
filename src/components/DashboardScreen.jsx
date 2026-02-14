import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Maximize2 } from "react-feather";
import WinningCardsModal from "./WinningcardsModal";
// Adjust the import path as necessary
import bingoCardsData from "../data/cards.json"; // Ensure this path is correct

const NUMBER_RANGE = Array.from({ length: 75 }, (_, i) => i + 1);
const CATEGORIES = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
};

const getCategory = (num) => {
  for (const [key, [min, max]] of Object.entries(CATEGORIES)) {
    if (num >= min && num <= max) return key;
  }
  return "";
};

// Enhanced category colors with gradients and glows for a more beautiful grid
const categoryColors = {
  B: "bg-gradient-to-br from-blue-500 via-blue-700 to-blue-900 text-blue-50 border-blue-400 shadow-blue-300/30",
  I: "bg-gradient-to-br from-pink-400 via-pink-600 to-pink-800 text-pink-50 border-pink-400 shadow-pink-300/30",
  N: "bg-gradient-to-br from-purple-500 via-purple-700 to-purple-900 text-purple-50 border-purple-400 shadow-purple-300/30",
  G: "bg-gradient-to-br from-green-500 via-green-700 to-green-900 text-green-50 border-green-400 shadow-green-300/30",
  O: "bg-gradient-to-br from-amber-400 via-orange-600 to-orange-900 text-amber-50 border-amber-400 shadow-orange-300/30",
};

// Converts a number (1-75) to Amharic words

export default function DashboardScreen({
  roundId,
  shopId,
  prize,
  selectedCards,
  interval,
  language, // This prop now controls voice language
  betPerCard,
  commissionRate,
  winningPattern,
  setCurrentView,
}) {
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [currentCall, setCurrentCall] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [winningCards, setWinningCards] = useState([]);
  const [failedCards, setFailedCards] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualCardId, setManualCardId] = useState("");
  const [mode, setMode] = useState("manual");
  const [status, setStatus] = useState("won");
  const [lastWinCheckNumberCount, setLastWinCheckNumberCount] = useState(0);
  const [passedCards, setPassedCards] = useState([]);
  const [lockedCards, setLockedCards] = useState([]);
  const intervalRef = useRef(null);
  const [winningPatterns, setWinningPatterns] = useState({});
  const [restartedCards, setRestartedCards] = useState([]);
  const [bingoCardsData, setBingoCards] = useState([]);

  // State and ref for speech synthesis
  const speechUtteranceRef = useRef(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const audioRef = useRef(null);
  const audioCache = useRef(new Map());

  useEffect(() => {
    const ranges = {
      b: [1, 15],
      i: [16, 30],
      n: [31, 45],
      g: [46, 60],
      o: [61, 75],
    };

    for (const [cat, [start, end]] of Object.entries(ranges)) {
      for (let i = start; i <= end; i++) {
        const path = `/bingowav/${cat}_${i}.mp3`;
        const audio = new Audio(path);
        audioCache.current.set(path, audio);
      }
    }

    console.log("✅ Correct audio files preloaded by column range");
  }, []);
  useEffect(() => {
    const shopId = localStorage.getItem("shopid");
    console.log("Shop ID from localStorage:", shopId);

    if (!shopId) {
      console.log("No shopId found — using local default cards.");
      setBingoCards(bingoCardsData); // local default
      return;
    }

    console.log(`Fetching data for shop: /data/${shopId}.json`);

    fetch(`/data/${shopId}.json`)
      .then((res) => {
        console.log("Fetch response:", res);
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        console.log("Fetched bingo data:", data);
        setBingoCards(data);
      })
      .catch((err) => {
        console.error("Error fetching shop data:", err);
        setBingoCards(bingoCardsData); // fallback to default
      });
  }, []);

  const playSoundForCall = (category, number) => {
    const audioPath = `/bingowav/${category.toLowerCase()}_${number}.mp3`;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const cachedAudio = audioCache.current.get(audioPath);
    if (cachedAudio) {
      audioRef.current = cachedAudio;
    } else {
      const fallback = new Audio(audioPath);
      audioCache.current.set(audioPath, fallback);
      audioRef.current = fallback;
    }

    // Web Audio API setup for volume boost
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 3.0; // 200% louder (1.0 = normal, 3.0 = 200% boost)

    const source = audioContext.createMediaElementSource(audioRef.current);
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((err) => {
      console.warn("🎧 Audio play error:", err);
    });
  };
  // --- Speech Synthesis Setup ---
  useEffect(() => {
    // Initialize SpeechSynthesisUtterance only once
    if (!speechUtteranceRef.current) {
      speechUtteranceRef.current = new SpeechSynthesisUtterance();
      speechUtteranceRef.current.volume = 1;
      speechUtteranceRef.current.rate = 1;
      speechUtteranceRef.current.pitch = 1;
    }

    const populateVoices = () => {
      setAvailableVoices(window.speechSynthesis.getVoices());
    };

    // Populate voices immediately if available
    populateVoices();

    // Listen for voices changed event (voices might load asynchronously or after user interaction)
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }

    return () => {
      // Clean up the listener when the component unmounts
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []); // Runs once on mount

  // Effect to speak the current number when it changes
  useEffect(() => {
    if (currentCall !== null) {
      const category = getCategory(currentCall);

      if (language === "Amharic") {
        playSoundForCall(category, currentCall);
      } else if (speechUtteranceRef.current && availableVoices.length > 0) {
        window.speechSynthesis.cancel();

        const textToSpeak = `${category}. ${currentCall}.`;
        speechUtteranceRef.current.text = textToSpeak;

        const voiceLangPrefix = language === "ti" ? "ti" : "en";
        const selectedVoice = availableVoices.find(
          (voice) =>
            voice.lang.startsWith(voiceLangPrefix) &&
            (voice.name.includes("Google") ||
              voice.name.includes("Microsoft") ||
              voice.default),
        );

        if (selectedVoice) {
          speechUtteranceRef.current.voice = selectedVoice;
          speechUtteranceRef.current.lang = selectedVoice.lang;
        } else {
          speechUtteranceRef.current.lang = "en-US";
        }

        try {
          window.speechSynthesis.speak(speechUtteranceRef.current);
        } catch (e) {
          console.error("Speech synthesis failed:", e);
        }
      }
    }
  }, [currentCall, language, availableVoices]);
  // Dependencies for this effect

  // Helper function to convert card object to a 5x5 grid array (handling null for free space)
  const getCardGrid = (card) => {
    const grid = [];
    const columns = ["B", "I", "N", "G", "O"];
    for (let i = 0; i < 5; i++) {
      grid.push([]);
      for (let j = 0; j < 5; j++) {
        grid[i].push(card[columns[j]][i]);
      }
    }
    return grid;
  };

  // Helper to check if a number on a card is considered "marked" (called or free space)
  const isMarked = (num, calledNumbersSet) => {
    return num === null || calledNumbersSet.has(num);
  };

  // Check for lines (rows, columns, diagonals) completed on a card
  const checkLinesOnCard = (grid, calledNumbersSet) => {
    let linesWon = 0;

    // Check Rows
    for (let i = 0; i < 5; i++) {
      if (grid[i].every((num) => isMarked(num, calledNumbersSet))) {
        linesWon++;
      }
    }

    // Check Columns
    for (let j = 0; j < 5; j++) {
      let colComplete = true;
      for (let i = 0; i < 5; i++) {
        if (!isMarked(grid[i][j], calledNumbersSet)) {
          colComplete = false;
          break;
        }
      }
      if (colComplete) {
        linesWon++;
      }
    }

    // Check Diagonals
    let diag1Complete = true; // Top-left to bottom-right
    for (let i = 0; i < 5; i++) {
      if (!isMarked(grid[i][i], calledNumbersSet)) {
        diag1Complete = false;
        break;
      }
    }
    if (diag1Complete) {
      linesWon++;
    }

    let diag2Complete = true; // Top-right to bottom-left
    for (let i = 0; i < 5; i++) {
      if (!isMarked(grid[i][4 - i], calledNumbersSet)) {
        diag2Complete = false;
        break;
      }
    }
    if (diag2Complete) {
      linesWon++;
    }

    return linesWon;
  };

  // Check for Full House win
  const checkFullHouseWin = (grid, calledNumbersSet) => {
    return grid.flat().every((num) => isMarked(num, calledNumbersSet));
  };
  // Check for Four Corners win
  const checkFourCornersWin = (grid, calledNumbersSet) => {
    const corners = [
      grid[0][0], // top-left
      grid[0][4], // top-right
      grid[4][0], // bottom-left
      grid[4][4], // bottom-right
    ];

    return corners.every((num) => isMarked(num, calledNumbersSet));
  };
  //check for Cross Pattern win
  const checkCrossPatternWin = (grid, calledNumbersSet) => {
    const middle = 2; // center index for 5x5 grid

    // Get middle row and column values (center cell is shared, avoid duplicate)
    const crossNumbers = new Set();

    // Add middle row
    for (let col = 0; col < 5; col++) {
      crossNumbers.add(grid[middle][col]);
    }

    // Add middle column
    for (let row = 0; row < 5; row++) {
      if (row !== middle) {
        crossNumbers.add(grid[row][middle]);
      }
    }

    // Check if all cross numbers are marked
    return [...crossNumbers].every((num) => isMarked(num, calledNumbersSet));
  };
  // check inner corner
  const checkInnerCornersAndCenterWin = (grid, calledNumbersSet) => {
    const positions = [
      grid[1][1], // top-left inner
      grid[1][3], // top-right inner
      grid[3][1], // bottom-left inner
      grid[3][3], // bottom-right inner
      grid[2][2], // center (usually FREE)
    ];

    return positions.every((num) => isMarked(num, calledNumbersSet));
  };
  const getWinningLineCoords = (grid, calledNumbersSet) => {
    const coords = [];

    // Rows
    for (let i = 0; i < 5; i++) {
      if (grid[i].every((num) => isMarked(num, calledNumbersSet))) {
        for (let j = 0; j < 5; j++) coords.push([i, j]);
      }
    }

    // Columns
    for (let j = 0; j < 5; j++) {
      let colComplete = true;
      for (let i = 0; i < 5; i++) {
        if (!isMarked(grid[i][j], calledNumbersSet)) {
          colComplete = false;
          break;
        }
      }
      if (colComplete) {
        for (let i = 0; i < 5; i++) coords.push([i, j]);
      }
    }

    // Diagonals
    let diag1 = true;
    for (let i = 0; i < 5; i++) {
      if (!isMarked(grid[i][i], calledNumbersSet)) {
        diag1 = false;
        break;
      }
    }
    if (diag1) {
      for (let i = 0; i < 5; i++) coords.push([i, i]);
    }

    let diag2 = true;
    for (let i = 0; i < 5; i++) {
      if (!isMarked(grid[i][4 - i], calledNumbersSet)) {
        diag2 = false;
        break;
      }
    }
    if (diag2) {
      for (let i = 0; i < 5; i++) coords.push([i, 4 - i]);
    }

    return coords;
  };

  const getCompletedLinesWithCoords = (grid, calledNumbersSet) => {
    const lines = [];

    // rows
    for (let i = 0; i < 5; i++) {
      if (grid[i].every((num) => isMarked(num, calledNumbersSet))) {
        lines.push({
          type: "row",
          index: i,
          coords: Array.from({ length: 5 }, (_, j) => [i, j]),
        });
      }
    }

    // columns
    for (let j = 0; j < 5; j++) {
      let complete = true;

      for (let i = 0; i < 5; i++) {
        if (!isMarked(grid[i][j], calledNumbersSet)) {
          complete = false;
          break;
        }
      }

      if (complete) {
        lines.push({
          type: "col",
          index: j,
          coords: Array.from({ length: 5 }, (_, i) => [i, j]),
        });
      }
    }

    // diagonal top-left -> bottom-right
    let diag1 = true;
    for (let i = 0; i < 5; i++) {
      if (!isMarked(grid[i][i], calledNumbersSet)) {
        diag1 = false;
        break;
      }
    }

    if (diag1) {
      lines.push({
        type: "diag",
        index: 0,
        coords: Array.from({ length: 5 }, (_, i) => [i, i]),
      });
    }

    // diagonal top-right -> bottom-left
    let diag2 = true;
    for (let i = 0; i < 5; i++) {
      if (!isMarked(grid[i][4 - i], calledNumbersSet)) {
        diag2 = false;
        break;
      }
    }

    if (diag2) {
      lines.push({
        type: "diag",
        index: 1,
        coords: Array.from({ length: 5 }, (_, i) => [i, 4 - i]),
      });
    }

    return lines;
  };

  const getFullHouseCoords = () => {
    const coords = [];
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        coords.push([i, j]);
      }
    }
    return coords;
  };

  const getFourCornersCoords = () => [
    [0, 0],
    [0, 4],
    [4, 0],
    [4, 4],
  ];

  const getCrossCoords = () => {
    const coords = [];
    const middle = 2;
    for (let i = 0; i < 5; i++) coords.push([middle, i]); // middle row
    for (let i = 0; i < 5; i++) {
      if (i !== middle) coords.push([i, middle]); // middle column (excluding center)
    }
    return coords;
  };
  const getInnerCornersAndCenterCoords = () => [
    [1, 1],
    [1, 3],
    [3, 1],
    [3, 3],
    [2, 2],
  ];
  const linesCross = (lineA, lineB) => {
    return lineA.coords.some((a) =>
      lineB.coords.some((b) => a[0] === b[0] && a[1] === b[1]),
    );
  };
  const findNonCrossingSets = (lines, requiredCount) => {
    const results = [];

    const backtrack = (start, combo) => {
      if (combo.length === requiredCount) {
        results.push([...combo]);
        return;
      }

      for (let i = start; i < lines.length; i++) {
        const candidate = lines[i];

        const crosses = combo.some((existing) =>
          linesCross(existing, candidate),
        );

        if (!crosses) {
          combo.push(candidate);
          backtrack(i + 1, combo);
          combo.pop();
        }
      }
    };

    backtrack(0, []);
    return results;
  };
  const dedupeCoords = (coords) => {
    return [...new Map(coords.map((c) => [c.join(","), c])).values()];
  };

  const gameOverRef = useRef(false);
  // Main win checking function

  //manual check function
  const handleManualCheck = async () => {
    if (!manualCardId) {
      alert("Please enter a Card ID.");
      return;
    }

    if (!calledNumbers.length) {
      alert("No called numbers yet. Cannot check.");
      return;
    }

    const normalizedManualId = Number(manualCardId.trim());

    if (lockedCards.includes(normalizedManualId)) {
      alert(
        `Card ${normalizedManualId} has already passed. It cannot win anymore.`,
      );
      return;
    }

    const selectedCardsData = bingoCardsData.filter((card) =>
      selectedCards.includes(card.card_id),
    );
    const card = selectedCardsData.find(
      (c) => c.card_id === normalizedManualId,
    );

    if (!card) {
      alert("Card ID not found in selected cards.");
      return;
    }

    const currentCalledNumbersSet = new Set(calledNumbers);
    const cardGrid = getCardGrid(card);
    let isWinner = false;
    let winningCoords = [];

    switch (winningPattern) {
      case "1 Line": {
        const coords = getWinningLineCoords(cardGrid, currentCalledNumbersSet);
        if (coords.length >= 5) {
          isWinner = true;
          winningCoords = coords;
        }
        break;
      }
      case "2 Lines": {
        const coords = getWinningLineCoords(cardGrid, currentCalledNumbersSet);
        if (coords.length >= 10) {
          isWinner = true;
          winningCoords = coords;
        }
        break;
      }
      case "Full House": {
        if (checkFullHouseWin(cardGrid, currentCalledNumbersSet)) {
          isWinner = true;
          winningCoords = getFullHouseCoords();
        }
        break;
      }
      case "Four Corners": {
        if (checkFourCornersWin(cardGrid, currentCalledNumbersSet)) {
          isWinner = true;
          winningCoords = getFourCornersCoords();
        }
        break;
      }
      case "Cross": {
        if (checkCrossPatternWin(cardGrid, currentCalledNumbersSet)) {
          isWinner = true;
          winningCoords = getCrossCoords();
        }
        break;
      }
      case "Inner Corners + Center": {
        if (checkInnerCornersAndCenterWin(cardGrid, currentCalledNumbersSet)) {
          isWinner = true;
          winningCoords = getInnerCornersAndCenterCoords();
        }
        break;
      }
      case "2 Vertical + 1 Horizontal": {
        const lines = getCompletedLinesWithCoords(
          cardGrid,
          currentCalledNumbersSet,
        );

        const verticals = lines.filter((l) => l.type === "col");
        const horizontals = lines.filter((l) => l.type === "row");

        if (verticals.length >= 2 && horizontals.length >= 1) {
          isWinner = true;
          winningCoords = [
            ...verticals.slice(0, 2).flatMap((l) => l.coords),
            ...horizontals[0].coords,
          ];
        }
        break;
      }
      case "4 Lines Any Direction": {
        const lines = getCompletedLinesWithCoords(
          cardGrid,
          currentCalledNumbersSet,
        );

        if (lines.length >= 4) {
          isWinner = true;
          winningCoords = lines.slice(0, 4).flatMap((l) => l.coords);
        }
        break;
      }
      case "5 Lines Any Direction": {
        const lines = getCompletedLinesWithCoords(
          cardGrid,
          currentCalledNumbersSet,
        );

        if (lines.length >= 5) {
          isWinner = true;
          winningCoords = lines.slice(0, 5).flatMap((l) => l.coords);
        }
        break;
      }
      case "6 Lines Any Direction": {
        const lines = getCompletedLinesWithCoords(
          cardGrid,
          currentCalledNumbersSet,
        );

        if (lines.length >= 6) {
          isWinner = true;
          winningCoords = lines.slice(0, 6).flatMap((l) => l.coords);
        }
        break;
      }
      case "3 Lines Any Direction": {
        const lines = getCompletedLinesWithCoords(
          cardGrid,
          currentCalledNumbersSet,
        );

        if (lines.length >= 3) {
          isWinner = true;
          winningCoords = lines.slice(0, 3).flatMap((l) => l.coords);
        }
        break;
      }
      case "X + 1 Horizontal": {
        const lines = getCompletedLinesWithCoords(
          cardGrid,
          currentCalledNumbersSet,
        );

        const diagonals = lines.filter((l) => l.type === "diag");
        const horizontals = lines.filter((l) => l.type === "row");

        if (diagonals.length === 2 && horizontals.length >= 1) {
          isWinner = true;
          winningCoords = [
            ...diagonals.flatMap((l) => l.coords),
            ...horizontals[0].coords,
          ];
        }
        break;
      }
      case "2 Horizontal + 2 Vertical": {
        const lines = getCompletedLinesWithCoords(
          cardGrid,
          currentCalledNumbersSet,
        );

        const horizontals = lines.filter((l) => l.type === "row");
        const verticals = lines.filter((l) => l.type === "col");

        if (horizontals.length >= 2 && verticals.length >= 2) {
          isWinner = true;
          winningCoords = [
            ...horizontals.slice(0, 2).flatMap((l) => l.coords),
            ...verticals.slice(0, 2).flatMap((l) => l.coords),
          ];
        }
        break;
      }
      case "Large T + Diagonal": {
        const lines = getCompletedLinesWithCoords(
          cardGrid,
          currentCalledNumbersSet,
        );

        const topRow = lines.find((l) => l.type === "row" && l.index === 0);
        const middleCol = lines.find((l) => l.type === "col" && l.index === 2);
        const diag = lines.find((l) => l.type === "diag");

        if (topRow && middleCol && diag) {
          isWinner = true;
          winningCoords = [
            ...topRow.coords,
            ...middleCol.coords,
            ...diag.coords,
          ];
        }
        break;
      }
      case "3 Non Crossing Lines": {
        const lines = getCompletedLinesWithCoords(
          cardGrid,
          currentCalledNumbersSet,
        );
        const combos = findNonCrossingSets(lines, 3);

        if (combos.length > 0) {
          isWinner = true;
          winningCoords = combos[0].flatMap((l) => l.coords);
        }
        break;
      }
      case "4 Non Crossing Lines": {
        const lines = getCompletedLinesWithCoords(
          cardGrid,
          currentCalledNumbersSet,
        );
        const combos = findNonCrossingSets(lines, 4);

        if (combos.length > 0) {
          isWinner = true;
          winningCoords = combos[0].flatMap((l) => l.coords);
        }
        break;
      }
      case "All": {
        const allCoords = [];

        const lines = getCompletedLinesWithCoords(
          cardGrid,
          currentCalledNumbersSet,
        );

        const rows = lines.filter((l) => l.type === "row");
        const cols = lines.filter((l) => l.type === "col");
        const diags = lines.filter((l) => l.type === "diag");

        // --- EXISTING PATTERNS ---

        const lineCoords = getWinningLineCoords(
          cardGrid,
          currentCalledNumbersSet,
        );
        if (lineCoords.length >= 5) {
          allCoords.push(...lineCoords);
          isWinner = true;
        }

        if (checkFullHouseWin(cardGrid, currentCalledNumbersSet)) {
          allCoords.push(...getFullHouseCoords());
          isWinner = true;
        }

        if (checkFourCornersWin(cardGrid, currentCalledNumbersSet)) {
          allCoords.push(...getFourCornersCoords());
          isWinner = true;
        }

        if (checkCrossPatternWin(cardGrid, currentCalledNumbersSet)) {
          allCoords.push(...getCrossCoords());
          isWinner = true;
        }

        // --- NEW PATTERN 1 ---
        if (cols.length >= 2 && rows.length >= 1) {
          allCoords.push(
            ...cols.slice(0, 2).flatMap((l) => l.coords),
            ...rows[0].coords,
          );
          isWinner = true;
        }

        // --- NEW PATTERNS 2-5 ---
        if (lines.length >= 3) {
          allCoords.push(...lines.slice(0, 3).flatMap((l) => l.coords));
          isWinner = true;
        }

        if (lines.length >= 4) {
          allCoords.push(...lines.slice(0, 4).flatMap((l) => l.coords));
          isWinner = true;
        }

        if (lines.length >= 5) {
          allCoords.push(...lines.slice(0, 5).flatMap((l) => l.coords));
          isWinner = true;
        }

        if (lines.length >= 6) {
          allCoords.push(...lines.slice(0, 6).flatMap((l) => l.coords));
          isWinner = true;
        }

        // --- NEW PATTERN 6 (X + Horizontal) ---
        if (diags.length === 2 && rows.length >= 1) {
          allCoords.push(...diags.flatMap((l) => l.coords), ...rows[0].coords);
          isWinner = true;
        }

        // --- NEW PATTERN 7 (2H + 2V) ---
        if (rows.length >= 2 && cols.length >= 2) {
          allCoords.push(
            ...rows.slice(0, 2).flatMap((l) => l.coords),
            ...cols.slice(0, 2).flatMap((l) => l.coords),
          );
          isWinner = true;
        }

        // --- NEW PATTERN 8 (Large T + Diagonal) ---
        const topRow = rows.find((r) => r.index === 0);
        const middleCol = cols.find((c) => c.index === 2);
        const anyDiag = diags[0];

        if (topRow && middleCol && anyDiag) {
          allCoords.push(
            ...topRow.coords,
            ...middleCol.coords,
            ...anyDiag.coords,
          );
          isWinner = true;
        }

        // --- NEW PATTERN 9 ---
        const nonCross3 = findNonCrossingSets(lines, 3);
        if (nonCross3.length > 0) {
          allCoords.push(...nonCross3[0].flatMap((l) => l.coords));
          isWinner = true;
        }

        // --- NEW PATTERN 10 ---
        const nonCross4 = findNonCrossingSets(lines, 4);
        if (nonCross4.length > 0) {
          allCoords.push(...nonCross4[0].flatMap((l) => l.coords));
          isWinner = true;
        }

        // --- DEDUPE COORDS (VERY IMPORTANT) ---
        winningCoords = [
          ...new Map(allCoords.map((c) => [c.join(","), c])).values(),
        ];

        break;
      }
      default:
        console.warn(`Unknown winning pattern: ${winningPattern}`);
        break;
    }

    if (isWinner) {
      console.log(`Manual winner found: Card ID ${manualCardId}`);
      try {
        setStatus("won");
        setIsRunning(false);
        setWinningCards([normalizedManualId]);
        setWinningPatterns({ [normalizedManualId]: winningCoords }); // 🎯 Save winning pattern coords
        setIsModalOpen(true);
        window.speechSynthesis.cancel();
      } catch (error) {
        console.error("Error submitting manual winning:", error);
        alert("Failed to submit manual winning.");
      }
    } else {
      setStatus("failed");
      setFailedCards([normalizedManualId]);
      setIsModalOpen(true);
    }
  };

  const checkWinA = () => {
    //console.log("Checking for wins with winning pattern:", winningPattern);
    const currentCalledNumbersSet = new Set(calledNumbers);
    const cardsToCheck = bingoCardsData.filter((card) =>
      selectedCards.includes(card.card_id),
    );
    const wincardid = null;
    let isWinner = false;
    for (const card of cardsToCheck) {
      const cardGrid = getCardGrid(card);

      switch (winningPattern) {
        case "1 Line":
          if (checkLinesOnCard(cardGrid, currentCalledNumbersSet) >= 1)
            isWinner = true;
          //console.log(`Checking card ${card.card_id} for 1 Line win: ${isWinner}`);
          break;
        case "2 Lines":
          if (checkLinesOnCard(cardGrid, currentCalledNumbersSet) >= 2)
            isWinner = true;
          break;
        case "Full House":
          if (checkFullHouseWin(cardGrid, currentCalledNumbersSet))
            isWinner = true;
          break;
        case "Four Corners":
          if (checkFourCornersWin(cardGrid, currentCalledNumbersSet))
            isWinner = true;
          break;
        case "Cross":
          isWinner = checkCrossPatternWin(cardGrid, currentCalledNumbersSet);
          break;
        case "Inner Corners + Center":
          isWinner = checkInnerCornersAndCenterWin(
            cardGrid,
            currentCalledNumbersSet,
          );
          break;
        case "All":
          if (
            checkLinesOnCard(cardGrid, currentCalledNumbersSet) >= 2 &&
            checkFullHouseWin(cardGrid, currentCalledNumbersSet) &&
            checkFourCornersWin(cardGrid, currentCalledNumbersSet) &&
            checkCrossPatternWin(cardGrid, currentCalledNumbersSet) &&
            checkInnerCornersAndCenterWin(cardGrid, currentCalledNumbersSet)
          )
            isWinner = true;
          //console.log(`Checking card ${card.card_id} for 1 Line win: ${isWinner}`);
          break;
      }
      // Check if this card has already won
      if (isWinner) {
        console.log(`Winner found: Card ID ${card.card_id}`);
        if (passedCards.includes(card.card_id)) {
          // Second time it's winning — lock it
          console.log(
            `🔒 Card ${wincardid} locked (won again after being passed)`,
          );
          setLockedCards((prev) => [...prev, card.card_id]);
          break;
        } else {
          // First time it's winning — pass it
          console.log(`⚠️ Card ${wincardid} passed (won too late)`);
          setPassedCards((prev) => [...prev, card.card_id]);
          break;
        }
      }
    }
  };
  // Update callNextNumber to check gameOverRef
  const callNextNumber = () => {
    if (gameOverRef.current || winningCards.length > 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const remaining = NUMBER_RANGE.filter((n) => !calledNumbers.includes(n));
    if (remaining.length === 0) {
      gameOverRef.current = true;
      setIsRunning(false);
      return;
    }

    const next = remaining[Math.floor(Math.random() * remaining.length)];
    const updatedCalledNumbers = [next, ...calledNumbers];
    setCalledNumbers(updatedCalledNumbers);
    setCurrentCall(next);

    // 🛑 Only check for winners if mode is not manual
    if (mode !== "manual") {
      const currentCalledNumbersSet = new Set(updatedCalledNumbers);
      const cardsToCheck = bingoCardsData.filter((card) =>
        selectedCards.includes(card.card_id),
      );

      let winners = [];
      for (const card of cardsToCheck) {
        const grid = getCardGrid(card);
        let isWinner = false;

        switch (winningPattern) {
          case "1 Line":
            isWinner = checkLinesOnCard(grid, currentCalledNumbersSet) >= 1;
            break;
          case "2 Lines":
            isWinner = checkLinesOnCard(grid, currentCalledNumbersSet) >= 2;
            break;
          case "Full House":
            isWinner = checkFullHouseWin(grid, currentCalledNumbersSet);
            break;
          case "Four Corners":
            isWinner = checkFourCornersWin(grid, currentCalledNumbersSet);
            break;
          case "Cross":
            isWinner = checkCrossPatternWin(grid, currentCalledNumbersSet);
            break;
          case "Inner Corners + Center":
            isWinner = checkInnerCornersAndCenterWin(
              grid,
              currentCalledNumbersSet,
            );
            break;
          case "All":
            isWinner =
              checkLinesOnCard(grid, currentCalledNumbersSet) >= 1 ||
              checkLinesOnCard(grid, currentCalledNumbersSet) >= 2 ||
              checkFullHouseWin(grid, currentCalledNumbersSet) ||
              checkFourCornersWin(grid, currentCalledNumbersSet) ||
              checkCrossPatternWin(grid, currentCalledNumbersSet);
            break;
        }

        if (isWinner && !winningCards.includes(card.card_id)) {
          winners.push(card.card_id);
        }
      }

      if (winners.length > 0) {
        gameOverRef.current = true;
        setWinningCards(winners);
        setIsRunning(false);
        window.speechSynthesis.cancel();
        setTimeout(() => {
          setIsModalOpen(true);
        }, 1000);

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        winners.forEach(async (cardId) => {
          try {
            await submitWinning({ cardId, roundId, shopId, prize });
          } catch (e) {
            console.error("Failed to submit winner:", cardId, e);
          }
        });
      }
    }
  };

  useEffect(() => {
    // Clear any existing interval
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    console.log(
      "Setting up interval with isRunning:",
      isRunning,
      "and winningCards:",
      winningCards.length,
    );
    // Set new interval only if running and no winners
    if (isRunning && !gameOverRef.current) {
      intervalRef.current = setInterval(() => callNextNumber(), interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, calledNumbers, interval, winningCards]);

  const playBoostedAudio = (src) => {
  const audio = new Audio(src);

  const audioContext = new (
    window.AudioContext || window.webkitAudioContext
  )();

  const gainNode = audioContext.createGain();
  gainNode.gain.value = 3.0; // boost volume

  const source = audioContext.createMediaElementSource(audio);
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  audio.play().catch((err) => {
    console.warn("Audio play blocked:", err);
  });
};

const togglePlayPause = () => {
  if (!isRunning) {
    // START GAME
    playBoostedAudio("/game/start_game.m4a");
  } else {
    // PAUSE GAME
    playBoostedAudio("/game/pause_game.m4a");

    // Delayed bingo voices (4 sec interval)
    setTimeout(() => {
      playBoostedAudio("/game/bingo1.m4a");
    }, 2000);

    setTimeout(() => {
      playBoostedAudio("/game/bingo2.m4a");
    }, 8000);

    setTimeout(() => {
      playBoostedAudio("/game/bingo3.m4a");
    }, 12000);
  }

  setIsRunning((prev) => !prev);
};


  const restartGame = () => {
    setIsRunning(false);
    setCalledNumbers([]);
    setCurrentCall(null);
    setWinningCards([]);
    setIsModalOpen(false);
    // 🔥 Pass selectedCards via props to CardManagementScreen
    setCurrentView({
      name: "card_management",
      props: {
        selectedCards,
      },
    });

    window.speechSynthesis.cancel(); // Stop any speech on restart
  };

  const requestFullScreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    }
  };

  return (
    <div className="w-screen h-screen bg-slate-950 p-6 text-slate-200 font-sans overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-3xl font-bold tracking-wide bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
          1616 Bingo
        </h1>

        <div className="flex items-center space-x-6 text-lg">
          <div className="font-medium flex items-center">
            <span className="mr-2 text-slate-400">Calls:</span>
            <span className="text-cyan-400">{calledNumbers.length}/75</span>
          </div>

          <div className="font-semibold flex items-center">
            <span className="mr-2 text-slate-400">Prize:</span>
            <span className="text-emerald-400">{prize.toFixed(2)} ETB</span>
          </div>

          {winningCards.length > 0 && (
            <div className="font-semibold flex items-center">
              <span className="mr-2 text-slate-400">Winners:</span>
              <span className="text-rose-400">{winningCards.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex space-x-6 h-[calc(100vh-144px)]">
        {/* Left Panel */}
        <div className="w-80 bg-slate-900 rounded-xl p-6 flex flex-col justify-between shadow-xl border border-slate-800">
          <div>
            <div className="text-base mb-3 text-slate-400 font-medium">
              Last 5 Called Numbers
            </div>

            <div className="grid grid-cols-5 gap-3">
              {[...calledNumbers.slice(0, 5)].map((n, i) => (
                <div
                  key={i}
                  className="text-center p-3 bg-slate-800 rounded-lg text-lg font-semibold border border-slate-700"
                >
                  {n ? n.toString().padStart(2, "0") : "--"}
                </div>
              ))}
            </div>
          </div>

          {/* Auto/Manual */}
          <div className="mt-6 mb-2 p-4 border border-slate-800 rounded-xl bg-slate-800/60 backdrop-blur w-full">
            <div className="mb-4 flex items-center gap-6 text-slate-300 font-medium">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={mode === "auto"}
                  onChange={() => setMode("auto")}
                  className="accent-emerald-500"
                />
                Auto
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={mode === "manual"}
                  onChange={() => setMode("manual")}
                  className="accent-emerald-500"
                />
                Manual
              </label>
            </div>

            {mode === "manual" && (
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <input
                  type="text"
                  placeholder="Enter Card ID"
                  value={manualCardId}
                  onChange={(e) => setManualCardId(e.target.value)}
                  className="flex-grow w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-0"
                />

                <button
                  onClick={handleManualCheck}
                  className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-2 rounded transition"
                >
                  Check
                </button>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button
              onClick={togglePlayPause}
              className={`flex items-center justify-center px-4 py-3 rounded-xl font-semibold shadow-lg transition transform hover:scale-105 ${
                isRunning
                  ? "bg-rose-600 text-white"
                  : "bg-gradient-to-r from-emerald-500 to-cyan-500 text-black"
              }`}
            >
              {isRunning ? (
                <Pause size={20} className="mr-2" />
              ) : (
                <Play size={20} className="mr-2" />
              )}
              {isRunning ? "Pause" : "Start"}
            </button>

            <button
              onClick={restartGame}
              className="flex items-center justify-center bg-slate-800 text-slate-200 px-4 py-3 rounded-xl font-semibold shadow hover:bg-slate-700"
            >
              <RotateCcw size={20} className="mr-2" />
              Restart
            </button>

            <button
              onClick={requestFullScreen}
              className="col-span-2 flex items-center justify-center bg-slate-800 text-slate-200 px-4 py-3 rounded-xl font-semibold shadow hover:bg-slate-700"
            >
              <Maximize2 size={20} className="mr-2" />
              Fullscreen
            </button>
          </div>
        </div>

        {/* Number Grid */}
        <div className="flex-1 p-6 rounded-xl bg-slate-900 shadow-xl border border-slate-800 overflow-y-auto">
          <div className="grid grid-cols-16 gap-2 text-center font-semibold text-base">
            {Object.entries(CATEGORIES).map(([letter, [min, max]]) => (
              <React.Fragment key={letter}>
                <div className="col-span-1 flex items-center justify-center text-xl font-bold uppercase bg-slate-800 border border-slate-700 rounded">
                  {letter}
                </div>

                {Array.from({ length: 15 }).map((_, colIndex) => {
                  const num = min + colIndex;
                  const isCurrent = num === currentCall;
                  const isCalled = calledNumbers.includes(num);

                  return (
                    <div
                      key={num}
                      className={`col-span-1 py-2 rounded-lg text-xl font-bold flex items-center justify-center cursor-pointer transition-all
                  ${
                    isCurrent
                      ? "bg-amber-400 text-black ring-2 ring-amber-300"
                      : isCalled
                        ? "bg-emerald-400 text-slate-800"
                        : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                      style={{ height: "48px" }}
                    >
                      {num.toString().padStart(2, "0")}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="justify-self-center mt-16">
            <div className="bg-slate-800 text-emerald-400 rounded-full p-16 w-80 text-center text-6xl font-extrabold tracking-widest shadow-inner border border-slate-700">
              {currentCall
                ? `${getCategory(currentCall)}${currentCall
                    .toString()
                    .padStart(2, "0")}`
                : "--"}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <WinningCardsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        winningCardIds={winningCards}
        failedCards={failedCards}
        allBingoCards={bingoCardsData}
        calledNumbersSet={new Set(calledNumbers)}
        status={status}
        winningPatterns={winningPatterns}
      />
    </div>
  );
}
