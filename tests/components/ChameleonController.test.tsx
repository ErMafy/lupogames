/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChameleonController } from '@/components/game/ChameleonController';

describe('ChameleonController', () => {
  it('fase HINTING: mostra ruolo camaleonte', () => {
    render(
      <ChameleonController
        phase="HINTING"
        secretWord={null}
        chameleonId="p-cham"
        currentPlayerId="p-cham"
        roundId="r1"
        onHint={vi.fn().mockResolvedValue(undefined)}
        onVote={vi.fn().mockResolvedValue(undefined)}
        hasSubmitted={false}
        timeRemaining={20}
      />,
    );
    expect(screen.getByText(/Sei il Camaleonte/i)).toBeInTheDocument();
  });

  it('fase HINTING: innocente vede la parola', () => {
    render(
      <ChameleonController
        phase="HINTING"
        secretWord="Pizza"
        chameleonId="p-cham"
        currentPlayerId="p-inn"
        roundId="r1"
        onHint={vi.fn().mockResolvedValue(undefined)}
        onVote={vi.fn().mockResolvedValue(undefined)}
        hasSubmitted={false}
        timeRemaining={20}
      />,
    );
    expect(screen.getByText('Pizza')).toBeInTheDocument();
  });

  it('fase VOTING: titolo schermata voto', () => {
    render(
      <ChameleonController
        phase="VOTING"
        secretWord={null}
        chameleonId="p-cham"
        currentPlayerId="p-inn"
        roundId="r1"
        hints={[{ playerId: 'p1', playerName: 'A', hint: 'x' }]}
        players={[{ id: 'p-inn', name: 'Me', avatar: null }]}
        onHint={vi.fn()}
        onVote={vi.fn().mockResolvedValue(undefined)}
        hasSubmitted={false}
        timeRemaining={10}
      />,
    );
    expect(screen.getByText(/Chi è il Camaleonte/i)).toBeInTheDocument();
  });
});
