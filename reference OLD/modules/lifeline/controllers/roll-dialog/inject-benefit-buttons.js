import { BENEFIT_DEFINITIONS } from '../../../character/benefits/benefit-definitions.js';

/*
Injects active diceBonus benefit buttons into the dice roller dialog.
benefitRef is a shared { bonus: 0 } object - updated as buttons are toggled.
Clears previous buttons and resets the bonus before injecting.
*/
export function injectBenefitButtons(html, actor, benefitRef) {
    const container = html.find('.benefit-buttons-container');
    const buttonsDiv = html.find('.benefit-roll-buttons');
    const display = html.find('.benefit-bonus-display');
    buttonsDiv.empty();
    display.text('');
    benefitRef.bonus = 0;

    const active = BENEFIT_DEFINITIONS.filter(b =>
        b.mechanic === 'diceBonus' && actor.system.benefits?.[b.id]
    );

    if (active.length === 0) {
        container.hide();
        return;
    }

    container.show();
    active.forEach(b => {
        const btn = $(`<button type="button" class="benefit-roll-btn" title="${b.description}">${b.name} (+${b.bonusAmount})</button>`);
        btn.data('bonus', b.bonusAmount);
        btn.on('click', (e) => {
            e.preventDefault();
            btn.toggleClass('active');
            benefitRef.bonus = buttonsDiv.find('.benefit-roll-btn.active').toArray()
                .reduce((sum, el) => sum + (Number($(el).data('bonus')) || 0), 0);
            display.text(benefitRef.bonus > 0 ? `Benefit Bonus: +${benefitRef.bonus}` : '');
        });
        buttonsDiv.append(btn);
    });
}
