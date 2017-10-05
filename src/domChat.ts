import { compact as _compact } from 'lodash';
import { Observable, Observer, Subscription } from 'rxjs';

const CHAT_POLL_INTERVAL = 500;

export interface DomChatMessage {
  author: string;
  text: string;
}

const chatLine2DomChatMessage = (chatLine: Element): (DomChatMessage | null) => {
  const lines = chatLine.getElementsByClassName('log-line');
  // Non-chat messages have no content in the second 'log-line' element, so skip those
  if (lines.length < 2 || lines[lines.length - 1].textContent === '') {
    return null;
  }

  const author = (lines[0].textContent || '').replace(/:\s$/, '');
  const text = lines[1].textContent || '';

  return { author, text };
};

export class DomChat {
  chatFormRoot: Element;
  chatLogRoot: Element;
  chatLinesProcessed: number;
  chatObservable: Observable<DomChatMessage>;

  // Pass this the element that contains the chat log div and the chat submit form.
  constructor(rootChatElt: Element) {
    if (!rootChatElt) {
      throw new Error('DomChat needs the root chat element');
    }

    const chatFormRoot = rootChatElt.querySelector('form');
    const chatLogRoot = rootChatElt.querySelector('.game-chat-display');

    if (!chatFormRoot) {
      throw new Error('Couldn\'t find chat submission form');
    } else if (!chatLogRoot) {
      throw new Error('Couldn\'t find chat log');
    }

    this.chatFormRoot = chatFormRoot;
    this.chatLogRoot = chatLogRoot;
    this.chatLinesProcessed = 0;

    this.chatObservable = Observable.create((observer: Observer<DomChatMessage>) => {
      const timerHandle = setInterval(() => {
        // Get all the chat lines that haven't already been processed
        const allChatLines = this.chatLogRoot.children;
        const newChatLines = [];
        for (let i = this.chatLinesProcessed; i < allChatLines.length; i++) {
          newChatLines.push(allChatLines[i]);
        }

        // Some chatLines don't represent chat messages - they can be stuff like "so and so
        // reconnected", "Undo request cancelled", etc - so skip those (they'll be null).
        const newDomChatMessages = _compact(newChatLines.map(chatLine2DomChatMessage));

        // Publish all the new messages
        if (newDomChatMessages.length > 0) {
          console.log(newDomChatMessages);
        }
        newDomChatMessages.forEach(dcm => observer.next(dcm));

        this.chatLinesProcessed = allChatLines.length;
      }, CHAT_POLL_INTERVAL);

      return () => {
        console.log('Cleaning up chat observable');
        clearInterval(timerHandle);
      };
    });
  }

  // Invokes your callback with each chat message as they arrive
  subscribe(next: (dcm: DomChatMessage) => any): Subscription  {
    return this.chatObservable.subscribe(next);
  }
}