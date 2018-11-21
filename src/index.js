import * as PIXI from 'pixi.js';

import { Deck } from './deck';
import { PileTableau, PileFoundation, PileStock, PileWaste } from './pile';

const TABLEAU = 7;
const FOUNDATION = 4;

export class Game {
    constructor (width, height) {
        // instantiate app
        this._app = new PIXI.Application(width, height, { backgroundColor: 0x076324, antialias: true });
        document.body.appendChild(this._app.view);

        // init a deck
        this._deck = new Deck();

        // init the piles
        this._stock = new PileStock();
        this._waste = new PileWaste();
        this._tableau = new Array(TABLEAU).fill().map(() => new PileTableau());
        this._foundation = new Array(FOUNDATION).fill().map(() => new PileFoundation());
    }

    load () {
        PIXI.loader
            .add('cards', './assets/cards.json')
            .load(this._onAssetsLoaded.bind(this));
    }

    _onAssetsLoaded () {
        this._setup();
        this._deal();
    }

    _setup () {
        // add cards
        this._deck.create();
        this._deck.cards.forEach(card => {
            this._app.stage.addChild(card);
        });

        // add and position stock pile
        this._stock.position.set(0, 0);
        this._app.stage.addChildAt(this._stock, 0);

        // add and position waste pile
        this._waste.position.set(100, 0);
        this._app.stage.addChildAt(this._waste, 0);

        // add and position foundation piles
        this._foundation.forEach((pile, index) => {
            pile.position.set((3 + index) * 100, 0);
            this._app.stage.addChildAt(pile, 0);
        });

        // add and position tableu piles
        this._tableau.forEach((pile, index) => {
            pile.position.set(index * 100, 120);
            this._app.stage.addChildAt(pile, 0);
        });
    }

    _deal () {
        // shuffle the deck
        this._deck.shuffle(780);

        // listen to when any card is dropped
        this._deck.cards.forEach(card => {
            card.on('dragstop', this._onDragStop, this);
            card.on('dragmove', this._onDragMove, this);
            card.on('pointertap', this._onTapCard, this);
        });

        // deal the cards on the tableau
        let ix = 0;
        for (let i = 0; i < TABLEAU; i++) {
            for (let j = 0; j < i+1; j++) {
                this._tableau[i].push(this._deck.cards[ix]);
                ix++;
            }
            this._tableau[i].last.enableDrag();
        }

        // add remaining card on stock
        for (ix; ix < this._deck.cards.length; ix++) {
            this._stock.push(this._deck.cards[ix]);
        }
        this._stock.last.enable();
        this._stock.on('tap', this._onTapStock, this);
    }

    _onDragStop (event) {
        const card = event.currentTarget;
        const pile = this._hitTest(card);

        if (pile) {
            if (pile.handle(card)) {
                card.pile.pop(card);
                pile.push(card);
                event.stopPropagation();
                this._checkVictory();
                return;
            }
        }

        card.cancel();
    }

    _onDragMove (event) {
        const card = event.currentTarget;
        const pile = this._hitTest(card);

        if (pile) {
            pile.debug(true);
        }
    }

    _onTapCard (event) {
        const card = event.currentTarget;

        if (card.moved) {
            return;
        }
    
        if (card.pile instanceof PileStock) {
            return;
        }

        let pile;
        if (card.pile instanceof PileWaste || card.pile instanceof PileTableau) {
            for (let i = 0; i < FOUNDATION; i++) {
                pile = this._foundation[i];
                if (card.pile !== pile && pile.handle(card)) {
                    card.pile.pop(card);
                    pile.push(card);
                    event.stopPropagation();
                    this._checkVictory();
                    return;
                }
            }
        }

        for (let i = 0; i < TABLEAU; i++) {
            pile = this._tableau[i];
            if (card.pile !== pile && pile.handle(card)) {
                card.pile.pop(card);
                pile.push(card);
                event.stopPropagation();
                return; 
            }
        }
    }

    _onTapStock (event) {
        let card;
        if (this._stock.last) {
            card = event.target;
            this._stock.pop(card);
            this._waste.push(card);
        } else {
            card = this._waste.last;
            while (card) {
                this._waste.pop(card);
                this._stock.push(card);
                card = this._waste.last;
            }
        }
    }

    _hitTest (card) {
        for (let i = 0; i < FOUNDATION; i++) {
            this._foundation[i].debug(false);
        }

        for (let i = 0; i < TABLEAU; i++) {
            this._tableau[i].debug(false);
        }

        let col = Math.round((card.x - this._foundation[0].x) / 100);
        let row = Math.round((card.y - this._foundation[0].y) / 95);

        if (col > -1 && col < FOUNDATION && row === 0) {
            return this._foundation[col];
        } else {
            col = Math.round((card.x - this._tableau[0].x) / 100);
            row = Math.round((card.y - this._tableau[0].y) / 95);
            if (col > -1 && col < TABLEAU && row > -1) {
                return this._tableau[col];
            }
        }

        return;
    }

    _checkVictory () {
        const sum = this._foundation.reduce((a, c) => {
            return a + ((c.last && c.last.rank === 'K') ? 1 : 0)
        }, 0);
        if (sum === FOUNDATION) {
            console.log('WIN');
        }
    }
}

const game = new Game(700, 600);
game.load();