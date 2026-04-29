const { createCanvas } = require("canvas");
const fs = require("fs");

// Chinese Character Symmetry Detector
// Checks for left-right (vertical axis) symmetry using visual analysis
// Font: Microsoft YaHei

class ChineseSymmetryDetector {
  constructor(options = {}) {
    this.fontSize = options.fontSize || 200;
    this.canvasSize = options.canvasSize || 256;
    this.font = options.font || "Microsoft YaHei";
    this.symmetryThreshold = options.symmetryThreshold || 0.95; // 95% pixels must match
    this.antiAliasingTolerance = options.antiAliasingTolerance || 30; // RGB tolerance for anti-aliasing
  }

  // Render a single character to canvas
  renderCharacter(char) {
    const canvas = createCanvas(this.canvasSize, this.canvasSize);
    const ctx = canvas.getContext("2d");

    // Fill background with white
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

    // Configure text rendering
    ctx.font = `${this.fontSize}px "${this.font}"`;
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw character in center
    ctx.fillText(char, this.canvasSize / 2, this.canvasSize / 2);

    // Save to a file for debugging
    const debugDir = "debug";

    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir);
    }

    const safeChar = char.replace(/[^a-zA-Z0-9]/g, (c) => c.charCodeAt(0));
    const filename = `${debugDir}/${safeChar}.png`;
    const buffer = canvas.toBuffer("image/png");

    fs.writeFileSync(filename, buffer);

    return canvas;
  }

  // Get image data from canvas
  getImageData(canvas) {
    const ctx = canvas.getContext("2d");
    return ctx.getImageData(0, 0, this.canvasSize, this.canvasSize);
  }

  // Check if two pixels are similar (handles anti-aliasing)
  pixelsSimilar(pixel1, pixel2, tolerance = this.antiAliasingTolerance) {
    for (let i = 0; i < 3; i++) {
      // R, G, B (skip alpha)
      if (Math.abs(pixel1[i] - pixel2[i]) > tolerance) {
        return false;
      }
    }
    return true;
  }

  // Check if a character has left-right symmetry
  isSymmetrical(char) {
    try {
      const canvas = this.renderCharacter(char);
      const imageData = this.getImageData(canvas);
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;

      let matchingPixels = 0;
      let totalPixels = 0;

      // Compare each pixel on the left with its mirror on the right
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width / 2; x++) {
          const leftPixelIndex = (y * width + x) * 4;
          const rightPixelIndex = (y * width + (width - 1 - x)) * 4;

          const leftPixel = [data[leftPixelIndex], data[leftPixelIndex + 1], data[leftPixelIndex + 2], data[leftPixelIndex + 3]];

          const rightPixel = [data[rightPixelIndex], data[rightPixelIndex + 1], data[rightPixelIndex + 2], data[rightPixelIndex + 3]];

          totalPixels++;

          // Check if pixels are similar (accounting for anti-aliasing)
          if (this.pixelsSimilar(leftPixel, rightPixel, this.antiAliasingTolerance)) {
            matchingPixels++;
          }
        }
      }

      const symmetryRatio = matchingPixels / totalPixels;
      return {
        isSymmetrical: symmetryRatio >= this.symmetryThreshold,
        ratio: symmetryRatio,
        matchingPixels,
        totalPixels,
      };
    } catch (error) {
      return {
        isSymmetrical: false,
        error: error.message,
        ratio: 0,
      };
    }
  }

  // Batch check a list of characters
  checkCharacters(characters) {
    console.log(`\nChecking ${characters.length} characters for left-right symmetry...`);
    console.log(`Using font: ${this.font}`);
    console.log(`Symmetry threshold: ${(this.symmetryThreshold * 100).toFixed(1)}%\n`);

    const results = {
      symmetrical: [],
      nearSymmetrical: [],
      asymmetrical: [],
    };

    characters.forEach((char, index) => {
      const result = this.isSymmetrical(char);

      if (result.error) {
        console.log(`Error processing '${char}': ${result.error}`);
        return;
      }

      const category = result.isSymmetrical ? "symmetrical" : result.ratio > 0.98 ? "nearSymmetrical" : "asymmetrical";

      results[category].push({
        character: char,
        unicode: char.codePointAt(0),
        ratio: (result.ratio * 100).toFixed(2),
        matchingPixels: result.matchingPixels,
        totalPixels: result.totalPixels,
      });

      if ((index + 1) % 50 === 0) {
        console.log(`Progress: ${index + 1}/${characters.length}`);
      }
    });

    return results;
  }

  // Print results in a formatted table
  printResults(results) {
    console.log("\n" + "=".repeat(70));
    console.log("RESULTS");
    console.log("=".repeat(70) + "\n");

    console.log(`PERFECTLY SYMMETRICAL (${results.symmetrical.length} characters of ${results.symmetrical.length + results.nearSymmetrical.length + results.asymmetrical.length} tested):`);
    console.log("-".repeat(70));
    if (results.symmetrical.length > 0) {
      results.symmetrical.forEach((item, idx) => {
        console.log(`${(idx + 1).toString().padStart(3)}. ${item.character} ` + `(${item.ratio}% match)` + ` (U+${item.unicode.toString(16).toUpperCase().padStart(4, "0")}, ${item.unicode})`.padEnd(15));
      });
    } else {
      console.log("None found");
    }

    console.log(`\nNEAR SYMMETRICAL (${results.nearSymmetrical.length} characters of ${results.nearSymmetrical.length + results.symmetrical.length + results.asymmetrical.length} tested):`);
    console.log("-".repeat(70));
    if (results.nearSymmetrical.length > 0) {
      results.nearSymmetrical.forEach((item, idx) => {
        console.log(`${(idx + 1).toString().padStart(3)}. ${item.character} ` + `(${item.ratio}% match)` + ` (U+${item.unicode.toString(16).toUpperCase().padStart(4, "0")}, ${item.unicode})`.padEnd(15));
      });
    } else {
      console.log("None found");
    }

    console.log(`\nASYMMETRICAL (${results.asymmetrical.length} characters of ${results.asymmetrical.length + results.symmetrical.length + results.nearSymmetrical.length} tested)`);
    console.log("-".repeat(70));
    console.log(`(only showing first 20)`);
    results.asymmetrical.slice(0, 20).forEach((item, idx) => {
      console.log(`${(idx + 1).toString().padStart(3)}. ${item.character} ` + `(${item.ratio}% match)` + ` (U+${item.unicode.toString(16).toUpperCase().padStart(4, "0")}, ${item.unicode})`.padEnd(15));
    });

    console.log("\n" + "=".repeat(80));
    console.log(`SUMMARY: ${results.symmetrical.length} perfectly symmetrical, ` + `${results.nearSymmetrical.length} near symmetrical, ` + `${results.asymmetrical.length} asymmetrical`);
    console.log("=".repeat(80) + "\n");
  }

  // Save results to JSON file
  saveResults(results, filename = "symmetry-results.json") {
    const output = {
      timestamp: new Date().toISOString(),
      font: this.font,
      fontSize: this.fontSize,
      symmetryThreshold: this.symmetryThreshold,
      results,
    };

    fs.writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`Results saved to ${filename}`);
  }
}

// Common Chinese Characters to Test
// (Includes examples mentioned + common CJK Unified Ideographs)
function getCommonChineseCharacters() {
  // Mentioned examples and common characters
  const examples = [
    "回", // return (mentioned as perfectly symmetrical)
    "日", // sun (mentioned in multiple categories)
    "田", // field (mentioned as perfectly symmetrical)
    "工", // work (mentioned as perfectly symmetrical)
    "木", // wood (mentioned as perfectly symmetrical)
    "大", // big (mentioned as perfectly symmetrical)
    "囍", // double happiness (mentioned as perfectly symmetrical)
    "口", // mouth (mentioned as vertical symmetry)
    "中", // middle (mentioned as vertical symmetry)
    "申", // explain (mentioned as vertical symmetry)
    "王", // king (mentioned as vertical symmetry)
  ];

  // Extended list of common characters
  const common = [
    "一",
    "二",
    "三",
    "四",
    "五",
    "六",
    "七",
    "八",
    "九",
    "十",
    "人",
    "手",
    "足",
    "心",
    "眼",
    "耳",
    "口",
    "鼻",
    "山",
    "水",
    "火",
    "土",
    "风",
    "雨",
    "亏",
    "元",
    "匀",
    "刈",
    "刀",
    "匹",
    "夫",
    "丰",
    "子",
    "女",
    "男",
    "家",
    "国",
    "米",
    "禾",
    "谷",
    "豆",
    "车",
    "马",
    "牛",
    "羊",
    "春",
    "夏",
    "秋",
    "冬",
    "上",
    "下",
    "左",
    "右",
    "中",
    "前",
    "后",
    "东",
    "西",
    "南",
    "北",
    "正",
    "方",
    "方",
    "圆",
  ];

  return [...new Set([...examples, ...common])]; // Remove duplicates
}

// Generate all CJK Unified Ideographs (comprehensive test)
// Returns characters from U+4E00 to U+9FFF (~20,000 characters)
function getAllChineseCharacters() {
  const start = 0x4e00; // CJK Unified Ideographs start
  const end = 0x9fff; // CJK Unified Ideographs end
  const chars = [];

  for (let i = start; i <= end; i++) {
    chars.push(String.fromCharCode(i));
  }

  console.log(`\nWARNING: Testing ${chars.length} characters will take a long time!`);
  console.log("Each character takes ~0.1-0.2 seconds to render and analyze.\n");

  return chars;
}

// Generate extended CJK test set (first 2000 characters)
// Good compromise between comprehensiveness and speed
function getExtendedChineseCharacters(limit = 2000) {
  const start = 0x4e00;
  const end = 0x9fff;
  const chars = [];

  for (let i = start; i <= end && chars.length < limit; i++) {
    chars.push(String.fromCharCode(i));
  }

  return chars;
}

// Parse command-line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  const mode = args[0] || "common";

  return {
    mode,
    validModes: ["common", "extended", "all"],
  };
}

// Print usage information
function printUsage() {
  console.log(`
=====================================================================
                       USAGE INFORMATION
=====================================================================

Run with different modes:

  npm start                    - Test ~60 common characters
  npm start -- common          - Test ~60 common characters
  npm start -- extended        - Test ~2000 characters
  npm start -- all             - Test ALL ~20,000 characters

Examples:
  node main.js common
  node main.js extended
  node main.js all

Output files:
  symmetry-results.json       - Detailed JSON results

Performance estimates:
  common:    about 60 chars
  extended:  about 2,000 chars
  all:       about 20,000 chars
`);
}

async function main() {
  try {
    const { mode, validModes } = parseArguments();

    // Validate mode
    if (!validModes.includes(mode) && isNaN(parseInt(mode))) {
      console.log(`Invalid mode: "${mode}"`);
      console.log(`Valid modes: ${validModes.join(", ")}`);
      printUsage();
      process.exit(1);
    }

    console.log("\n");
    console.log("====================================================================");
    console.log("       Chinese Character Symmetry Detector - Visual Analysis        ");
    console.log("              (Left-Right / Vertical Axis Symmetry)                 ");
    console.log("====================================================================");

    let characters;
    console.log(`\nMode: ${mode.toUpperCase()}`);

    if (mode === "common") {
      characters = getCommonChineseCharacters();
    } else if (mode === "extended") {
      characters = getExtendedChineseCharacters(2000);
      // if mode is a number, use that many characters from the extended set
    } else if (!isNaN(parseInt(mode))) {
      const limit = parseInt(mode);
      characters = getExtendedChineseCharacters(limit);
    } else if (mode === "all") {
      characters = getAllChineseCharacters();
    }

    const startTime = Date.now();

    const detector = new ChineseSymmetryDetector({
      fontSize: 200,
      canvasSize: 256,
      font: "Microsoft YaHei",
      symmetryThreshold: 0.993,
      antiAliasingTolerance: 30,
    });

    console.log(`\nStarting analysis of ${characters.length} characters...`);
    console.log(`\nunicode 19968 to ${characters[characters.length - 1].charCodeAt(0)}`);

    const results = detector.checkCharacters(characters);

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\nAnalysis complete in ${elapsedSeconds} seconds\n`);

    detector.printResults(results);

    // Create filename with mode and timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `symmetry-results-${mode}-${timestamp}.json`;

    detector.saveResults(results, filename);

    printUsage();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main();
