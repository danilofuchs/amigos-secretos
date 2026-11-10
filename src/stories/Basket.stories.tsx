import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect, useRef } from 'react';
import { fn } from 'storybook/test';
import { createBasketScene } from '@/lib/wicker-basket-3d';

function Basket({
  names,
  pour,
  width,
  height,
  onDone,
}: {
  names: string[];
  pour: boolean;
  width: number;
  height: number;
  onDone: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    const scene = createBasketScene(canvas.current, {
      width,
      height,
      names,
      pour,
      fontFamily: getComputedStyle(document.documentElement)
        .getPropertyValue('--font-handwriting')
        .trim(),
      onDone,
    });
    return () => scene.dispose();
  }, [names, pour, width, height, onDone]);
  return <canvas ref={canvas} style={{ width, height, display: 'block' }} />;
}

const meta = {
  title: 'Animations/Basket',
  component: Basket,
  args: {
    names: ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio'],
    pour: false,
    width: 720,
    height: 560,
    onDone: fn(),
  },
} satisfies Meta<typeof Basket>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Each name is written on a slip, folded and dropped in, then the basket is shaken. */
export const CollectAndShake: Story = {};

/** The empty basket on the send page: one shake, then it tips over to pour the slips out. */
export const ShakeAndPour: Story = { args: { names: [], pour: true } };
