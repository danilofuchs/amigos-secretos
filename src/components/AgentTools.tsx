'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  createExchangeForAgent,
  listExchangesForAgent,
  ticketLinksForAgent,
} from '@/app/agent-actions';
import {
  checkDraw,
  checkDrawSchema,
  createExchangeSchema,
  type AgentExchange,
} from '@/lib/agent-input';

/** The WebMCP surface this app uses: https://webmachinelearning.github.io/webmcp/ */
type ToolAnnotations = {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
  consequentialHint?: boolean;
};
type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations?: ToolAnnotations;
  execute(input: Record<string, unknown>, options?: { signal: AbortSignal }): Promise<unknown>;
};
type ModelContext = {
  registerTool(tool: Tool, options?: { signal?: AbortSignal }): Promise<void> | void;
  /** Early Chrome builds unregister by name instead of by abort signal. */
  unregisterTool?(name: string): void;
};
declare global {
  interface Document {
    readonly modelContext?: ModelContext;
  }
  interface Navigator {
    readonly modelContext?: ModelContext;
  }
}

const EXCHANGE_PAGE = /^\/sorteios\/([A-Za-z0-9]+)$/;

/**
 * Offers the organizer's actions to an AI agent in the browser, when the browser supports
 * WebMCP. The agent works through the same session and validation as the form; drawing the
 * names stays a human click, and participants' tickets are never opened by a tool.
 */
export function AgentTools() {
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    const context = document.modelContext ?? navigator.modelContext;
    if (!context) return;
    const exchangeId = EXCHANGE_PAGE.exec(path)?.[1];
    const tools: Tool[] = [
      {
        name: 'list_exchanges',
        title: 'List my gift exchanges',
        description:
          'Lists the secret-friend exchanges this browser organizes, with their status (draft, drawn or archived) and page path.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => listExchangesForAgent(),
      },
      {
        name: 'check_draw',
        title: 'Check whether names can be drawn',
        description:
          "Checks whether a secret-friend draw is possible with these names and rules (who can't draw whom), and if not, who would be left without anyone to draw. Saves nothing.",
        inputSchema: checkDrawSchema,
        annotations: { readOnlyHint: true },
        execute: async (input) => checkDraw(input as unknown as AgentExchange),
      },
      {
        name: 'create_exchange',
        title: 'Create a gift exchange',
        description:
          'Creates a draft secret-friend exchange with the given names, exclusion rules and details (occasion, date, time, location, gift theme, budget, free-text rules), then opens it so the organizer can review it and draw the names themselves. Nobody is notified.',
        inputSchema: createExchangeSchema,
        execute: async (input) => {
          const exchange = input as unknown as AgentExchange;
          const feasibility = checkDraw(exchange);
          const result = await createExchangeForAgent(exchange);
          if ('error' in result) return result;
          router.push(result.path);
          return {
            ...result,
            drawPossible: feasibility.possible,
            next: 'The organizer reviews the exchange and presses the draw button on its page.',
          };
        },
      },
    ];
    if (exchangeId)
      tools.push({
        name: 'get_ticket_links',
        title: 'Get the ticket links',
        description:
          'For the drawn exchange on this page: each participant’s private ticket link, a ready-to-send message for them, and whether they opened it. Each link reveals who that person drew, so send it only to that person.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => ticketLinksForAgent(exchangeId, window.location.origin),
      });

    const controller = new AbortController();
    for (const tool of tools) {
      // One tool the browser refuses must not keep the others from registering.
      try {
        void Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(
          (error: unknown) => console.warn(`WebMCP: couldn't register ${tool.name}`, error),
        );
      } catch (error) {
        console.warn(`WebMCP: couldn't register ${tool.name}`, error);
      }
    }
    return () => {
      controller.abort();
      for (const tool of tools) context.unregisterTool?.(tool.name);
    };
  }, [path, router]);

  return null;
}
