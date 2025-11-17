/**
 * Test Factories Tests
 * Week 2 Day 6: Testing Infrastructure
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildSession,
  buildParticipant,
  buildCatalogItem,
  buildPayment,
  buildCompleteSession,
  resetFactories,
} from '../../helpers/factories.js';

describe('Test Factories', () => {
  beforeEach(() => {
    resetFactories();
  });

  describe('buildSession', () => {
    it('should create a valid session with defaults', () => {
      const session = buildSession();

      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('session_id');
      expect(session.status).toBe('open');
      expect(session.session_type).toBe('minibag');
    });

    it('should accept overrides', () => {
      const session = buildSession({ status: 'completed', expected_participants: 3 });

      expect(session.status).toBe('completed');
      expect(session.expected_participants).toBe(3);
    });

    it('should generate unique session_ids', () => {
      const session1 = buildSession();
      const session2 = buildSession();

      expect(session1.session_id).not.toBe(session2.session_id);
    });
  });

  describe('buildParticipant', () => {
    it('should create a valid participant', () => {
      const participant = buildParticipant();

      expect(participant).toHaveProperty('id');
      expect(participant).toHaveProperty('nickname');
      expect(participant.is_host).toBe(false);
      expect(participant.items).toEqual({});
    });

    it('should accept session_id override', () => {
      const sessionId = 'test-session-id';
      const participant = buildParticipant({ session_id: sessionId });

      expect(participant.session_id).toBe(sessionId);
    });
  });

  describe('buildCatalogItem', () => {
    it('should create a valid catalog item', () => {
      const item = buildCatalogItem();

      expect(item).toHaveProperty('item_id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('emoji');
      expect(item.unit).toBe('kg');
      expect(item.is_active).toBe(true);
    });

    it('should generate sequential item_ids', () => {
      resetFactories();
      const item1 = buildCatalogItem();
      const item2 = buildCatalogItem();

      expect(item1.item_id).toBe('v001');
      expect(item2.item_id).toBe('v002');
    });
  });

  describe('buildPayment', () => {
    it('should create a valid payment', () => {
      const payment = buildPayment();

      expect(payment).toHaveProperty('id');
      expect(payment).toHaveProperty('session_id');
      expect(payment).toHaveProperty('participant_id');
      expect(payment.amount_paid).toBe(100);
      expect(payment.payment_method).toBe('cash');
      expect(payment.skip).toBe(false);
    });
  });

  describe('buildCompleteSession', () => {
    it('should create a session with participants and items', () => {
      const result = buildCompleteSession({ participantCount: 3, itemsPerParticipant: 2 });

      expect(result.session).toBeDefined();
      expect(result.participants).toHaveLength(3);
      expect(result.catalogItems).toHaveLength(2);

      // Check that participants have items
      result.participants.forEach(participant => {
        expect(Object.keys(participant.items).length).toBe(2);
      });
    });

    it('should link participants to session', () => {
      const result = buildCompleteSession({ participantCount: 2 });

      result.participants.forEach(participant => {
        expect(participant.session_id).toBe(result.session.id);
      });
    });
  });

  describe('resetFactories', () => {
    it('should reset ID counter', () => {
      buildCatalogItem(); // v001
      buildCatalogItem(); // v002
      resetFactories();
      const item = buildCatalogItem();

      expect(item.item_id).toBe('v001'); // Should restart from 001
    });
  });
});
