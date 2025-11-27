"use client";

import { Play, Pause, Droplets, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FlowAnimationControlsProps {
    isAnimating: boolean;
    speed: number;
    style: 'dashes' | 'particles' | 'glow' | 'combined';
    onToggle: () => void;
    onSpeedChange: (speed: number) => void;
    onStyleChange: (style: 'dashes' | 'particles' | 'glow' | 'combined') => void;
}

export function FlowAnimationControls({
    isAnimating,
    speed,
    style,
    onToggle,
    onSpeedChange,
    onStyleChange,
}: FlowAnimationControlsProps) {
    return (
        <div className="absolute top-4 right-20 bg-white rounded-lg shadow-lg p-3 space-y-3 z-10">
            {/* Animation Toggle */}
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant={isAnimating ? 'default' : 'outline'}
                    onClick={onToggle}
                    className="w-full"
                >
                    {isAnimating ? (
                        <>
                            <Pause className="h-4 w-4 mr-2" />
                            Stop Flow
                        </>
                    ) : (
                        <>
                            <Play className="h-4 w-4 mr-2" />
                            Animate Flow
                        </>
                    )}
                </Button>
            </div>

            {isAnimating && (
                <>
                    {/* Speed Control */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            Speed: {speed.toFixed(1)}x
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="5"
                            step="0.1"
                            value={speed}
                            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Slow</span>
                            <span>Fast</span>
                        </div>
                    </div>

                    {/* Style Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                            <Droplets className="h-3 w-3" />
                            Animation Style
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                size="sm"
                                variant={style === 'dashes' ? 'default' : 'outline'}
                                onClick={() => onStyleChange('dashes')}
                                className="text-xs"
                            >
                                Dashes
                            </Button>
                            <Button
                                size="sm"
                                variant={style === 'particles' ? 'default' : 'outline'}
                                onClick={() => onStyleChange('particles')}
                                className="text-xs"
                            >
                                Particles
                            </Button>
                            <Button
                                size="sm"
                                variant={style === 'glow' ? 'default' : 'outline'}
                                onClick={() => onStyleChange('glow')}
                                className="text-xs"
                            >
                                Glow
                            </Button>
                            <Button
                                size="sm"
                                variant={style === 'combined' ? 'default' : 'outline'}
                                onClick={() => onStyleChange('combined')}
                                className="text-xs"
                            >
                                All
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}