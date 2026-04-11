import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

function mockModel() {
  return {
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    update: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    upsert: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  };
}

const { sendToRoomMock, prismaMock, modelNames } = vi.hoisted(() => {
  const names = [
    'room',
    'player',
    'gameState',
    'triviaQuestion',
    'triviaRound',
    'triviaAnswer',
    'promptPhrase',
    'promptRound',
    'promptResponse',
    'promptVote',
    'secret',
    'secretRound',
    'secretVote',
    'gameContent',
    'gameRound',
    'gameAction',
    'avatar',
  ] as const;
  const send = vi.fn().mockResolvedValue(undefined);
  const base: Record<string, ReturnType<typeof mockModel>> = {};
  for (const name of names) {
    base[name] = mockModel();
  }
  const prismaLike = { ...base } as Record<string, unknown>;
  prismaLike.$transaction = vi.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof prismaLike) => Promise<unknown>)(prismaLike);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg as Promise<unknown>[]);
    }
    return undefined;
  });
  prismaLike.$connect = vi.fn().mockResolvedValue(undefined);
  prismaLike.$disconnect = vi.fn().mockResolvedValue(undefined);
  return { sendToRoomMock: send, prismaMock: prismaLike, modelNames: names };
});

vi.mock('@/lib/pusher-server', () => ({
  sendToRoom: sendToRoomMock,
  pusherServer: {
    authorizeChannel: vi.fn().mockReturnValue({ auth: 'test-auth' }),
    trigger: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  sendToRoomMock.mockResolvedValue(undefined);
  for (const name of modelNames) {
    const m = prismaMock[name] as ReturnType<typeof mockModel>;
    m.findUnique.mockResolvedValue(null);
    m.findFirst.mockResolvedValue(null);
    m.findMany.mockResolvedValue([]);
    m.create.mockResolvedValue({});
    m.update.mockResolvedValue({});
    m.updateMany.mockResolvedValue({ count: 0 });
    m.deleteMany.mockResolvedValue({ count: 0 });
    m.upsert.mockResolvedValue({});
    m.count.mockResolvedValue(0);
  }
  (prismaMock.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg as Promise<unknown>[]);
      }
      return undefined;
    },
  );
});
