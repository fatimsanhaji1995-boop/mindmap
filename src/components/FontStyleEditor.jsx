import { useState } from 'react';
import { Label } from '@/components/ui/label.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Slider } from '@/components/ui/slider.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import './FontStyleEditor.css';

/**
 * FontStyleEditor Component
 * Provides controls for editing font styles and colors
 * 
 * Props:
 * - fontStyle: { fontFamily, fontSize, fontWeight, color, backgroundColor }
 * - onStyleChange: callback when any style property changes
 * - presets: optional array of preset styles
 */
export const FontStyleEditor = ({
  fontStyle = {
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: 400,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    letterSpacing: 0,
    lineHeight: 1.5,
  },
  onStyleChange,
  presets = [],
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fontFamilies = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Verdana',
    'Comic Sans MS',
    'Trebuchet MS',
    'Impact',
    'Palatino',
    'Garamond',
    'Bookman',
    'Lucida Console',
    'Tahoma',
    'Lucida Grande',
  ];

  const fontWeights = [
    { label: 'Light', value: 300 },
    { label: 'Normal', value: 400 },
    { label: 'Medium', value: 500 },
    { label: 'Semi-Bold', value: 600 },
    { label: 'Bold', value: 700 },
    { label: 'Extra Bold', value: 800 },
    { label: 'Black', value: 900 },
  ];

  const handleStyleChange = (property, value) => {
    if (onStyleChange) {
      onStyleChange({
        ...fontStyle,
        [property]: value,
      });
    }
  };

  const handlePresetApply = (preset) => {
    if (onStyleChange) {
      onStyleChange(preset);
    }
  };

  return (
    <div className="font-style-editor">
      {/* Font Family */}
      <div className="space-y-2">
        <Label htmlFor="font-family">Font Family</Label>
        <Select
          value={fontStyle.fontFamily || 'Arial'}
          onValueChange={(value) => handleStyleChange('fontFamily', value)}
        >
          <SelectTrigger id="font-family">
            <SelectValue placeholder="Select font" />
          </SelectTrigger>
          <SelectContent>
            {fontFamilies.map((font) => (
              <SelectItem key={font} value={font}>
                <span style={{ fontFamily: font }}>{font}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <Label htmlFor="font-size">
          Font Size: <span className="font-semibold">{fontStyle.fontSize}px</span>
        </Label>
        <Slider
          id="font-size"
          value={[fontStyle.fontSize || 16]}
          onValueChange={(value) => handleStyleChange('fontSize', value[0])}
          min={8}
          max={72}
          step={1}
          className="w-full"
        />
      </div>

      {/* Font Weight */}
      <div className="space-y-2">
        <Label htmlFor="font-weight">Font Weight</Label>
        <Select
          value={String(fontStyle.fontWeight || 400)}
          onValueChange={(value) => handleStyleChange('fontWeight', parseInt(value))}
        >
          <SelectTrigger id="font-weight">
            <SelectValue placeholder="Select weight" />
          </SelectTrigger>
          <SelectContent>
            {fontWeights.map((weight) => (
              <SelectItem key={weight.value} value={String(weight.value)}>
                {weight.label} ({weight.value})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator className="my-3" />

      {/* Text Color */}
      <div className="space-y-2">
        <Label htmlFor="text-color">Text Color</Label>
        <div className="flex gap-2 items-center">
          <Input
            id="text-color"
            type="color"
            value={fontStyle.color || '#000000'}
            onChange={(e) => handleStyleChange('color', e.target.value)}
            className="w-20 h-10 cursor-pointer"
          />
          <Input
            type="text"
            value={fontStyle.color || '#000000'}
            onChange={(e) => handleStyleChange('color', e.target.value)}
            placeholder="#000000"
            className="flex-1 text-sm font-mono"
          />
        </div>
      </div>

      {/* Background Color */}
      <div className="space-y-2">
        <Label htmlFor="bg-color">Background Color</Label>
        <div className="flex gap-2 items-center">
          <Input
            id="bg-color"
            type="color"
            value={fontStyle.backgroundColor || '#FFFFFF'}
            onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
            className="w-20 h-10 cursor-pointer"
          />
          <Input
            type="text"
            value={fontStyle.backgroundColor || '#FFFFFF'}
            onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
            placeholder="#FFFFFF"
            className="flex-1 text-sm font-mono"
          />
        </div>
      </div>

      <Separator className="my-3" />

      {/* Advanced Options */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full"
      >
        {showAdvanced ? 'Hide Advanced' : 'Show Advanced'} Options
      </Button>

      {showAdvanced && (
        <>
          {/* Letter Spacing */}
          <div className="space-y-2 mt-3">
            <Label htmlFor="letter-spacing">
              Letter Spacing: <span className="font-semibold">{fontStyle.letterSpacing}px</span>
            </Label>
            <Slider
              id="letter-spacing"
              value={[fontStyle.letterSpacing || 0]}
              onValueChange={(value) => handleStyleChange('letterSpacing', value[0])}
              min={-5}
              max={10}
              step={0.5}
              className="w-full"
            />
          </div>

          {/* Line Height */}
          <div className="space-y-2">
            <Label htmlFor="line-height">
              Line Height: <span className="font-semibold">{fontStyle.lineHeight}</span>
            </Label>
            <Slider
              id="line-height"
              value={[fontStyle.lineHeight || 1.5]}
              onValueChange={(value) => handleStyleChange('lineHeight', value[0])}
              min={0.8}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>
        </>
      )}

      {/* Presets */}
      {presets.length > 0 && (
        <>
          <Separator className="my-3" />
          <div className="space-y-2">
            <Label>Style Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetApply(preset)}
                  className="text-xs"
                >
                  {preset.name || `Preset ${index + 1}`}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Preview */}
      <Separator className="my-3" />
      <div className="space-y-2">
        <Label>Preview</Label>
        <div
          className="font-style-editor-preview"
          style={{
            fontFamily: fontStyle.fontFamily,
            fontSize: `${fontStyle.fontSize}px`,
            fontWeight: fontStyle.fontWeight,
            color: fontStyle.color,
            backgroundColor: fontStyle.backgroundColor,
            letterSpacing: `${fontStyle.letterSpacing}px`,
            lineHeight: fontStyle.lineHeight,
          }}
        >
          The quick brown fox jumps over the lazy dog
        </div>
      </div>
    </div>
  );
};

export default FontStyleEditor;
