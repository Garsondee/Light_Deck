# Onboarding Assets

This directory contains assets used during the player onboarding process.

## Required Files

### test-image.png

A visual calibration test image with the following elements:

1. **Gradient Bar** (10 steps)
   - Pure black (#000000) to pure white (#FFFFFF)
   - Each step should be clearly distinguishable
   - Numbered 1-10 below each bar

2. **Fine Detail Zone**
   - Thin horizontal lines (1px)
   - Small text: "The quick brown fox jumps over the lazy dog"
   - Fine crosshatch pattern

3. **High Contrast Zone**
   - Sharp black/white edges
   - Checkerboard pattern
   - Bold text

4. **Low Contrast Zone**
   - Subtle gray gradients
   - Soft edges
   - Faint text that should be readable when calibrated

### Recommended Specifications

- **Resolution:** 1920x1080 (or 16:9 aspect ratio)
- **Format:** PNG (lossless)
- **Color Space:** sRGB
- **Background:** Dark gray (#1a1a1a) to match terminal aesthetic

### ASCII Art Version

For terminal-based calibration, use this ASCII gradient:

```
░░▒▒▓▓████████████████████████████████████████
 1  2  3  4  5  6  7  8  9  10

Fine detail: ════════════════════════════════
Small text: The quick brown fox jumps over the lazy dog
```

## Usage

The test image is loaded during the Visual Calibration phase of onboarding.
Players adjust brightness and contrast until they can:
1. See all 10 gradient bars distinctly
2. Read the fine detail text
3. Distinguish the low contrast elements
