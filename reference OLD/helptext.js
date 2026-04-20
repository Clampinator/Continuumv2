

export const HELP_TEXT = {
    spanGraph: `
        <div class="span-graph-help-content" style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px; margin-top: 0;"><i class="fas fa-project-diagram"></i> Using the Lifeline</h3>
            <p style="margin-bottom: 10px; font-size: 0.9em;">The Lifeline visualizes your character's subjective journey (X-Axis: Age) against objective history (Y-Axis: Date).</p>
            
            <h4 style="margin-top: 10px; color: #fff;">Navigation & Map Integration</h4>
            <ul style="margin-bottom: 10px; padding-left: 20px;">
                <li><strong>Pan & Zoom:</strong> Click and drag the background to pan. Use the mouse wheel to zoom in/out.</li>
                <li><strong>Map Mode:</strong> Click <i class="fas fa-map-marked-alt"></i> or <strong>Hold Spacebar</strong> to dim the graph and interact directly with the Google Map background (Pan/Zoom map).</li>
                <li><strong>Reset View:</strong> Click <i class="fas fa-compress-arrows-alt"></i> to fit the entire timeline on screen.</li>
            </ul>

            <h4 style="margin-top: 10px; color: #fff;">Time Travel (The "Head")</h4>
            <p style="margin-bottom: 5px;">The <strong>Yellow Glowing Node</strong> represents your current moment ("Now").</p>
            <ul style="margin-bottom: 10px; padding-left: 20px;">
                <li><strong>Live Level:</strong> Drag the Head <em>horizontally</em> to advance your subjective age and objective time equally.</li>
                <li><strong>Span:</strong> Drag the Head <em>vertically</em> to jump through time. The tooltip will show your Span Cost.</li>
                <li><strong>Timeline Scrubbing:</strong> Drag the <strong>Cyan Pin</strong> (ghost) along your past timeline path to "replay" your history. The map will fly to the location of previous events as you scrub past them.</li>
            </ul>

            <h4 style="margin-top: 10px; color: #fff;">Managing History</h4>
            <ul style="margin-bottom: 10px; padding-left: 20px;">
                <li><strong>Insert Events:</strong> Hover over any blue line segment (your past). A white ghost node will appear. Click to insert a retrospective event at that specific moment.</li>
                <li><strong>Edit Details:</strong> Click any <strong>Node</strong>, <strong>Age Label</strong>, or <strong>Experience Label</strong> to open its editor.</li>
                <li><strong>Define Eras:</strong> Drag the <strong>Blue Bar</strong> at the very bottom of the graph to manually define the duration of a new Age.</li>
            </ul>

            <h4 style="margin-top: 10px; color: #fff;">Goals & The Yet</h4>
            <ul style="margin-bottom: 10px; padding-left: 20px;">
                <li><strong>Link Goals:</strong> Drag a Goal chip from the top bank onto any Event Node to link them. A yellow star will appear.</li>
                <li><strong>Define Yet:</strong> Click anywhere in the "Future" (empty grid space to the right of the Head) to create a floating Yet marker.</li>
                <li><strong>Fulfill Yet:</strong> Drag a floating <strong>Yet Node</strong> (orange square) onto the <strong>Head Node</strong> to mark it as fulfilled at the current moment.</li>
            </ul>

            <h4 style="margin-top: 10px; color: #fff;">Data Tools</h4>
            <ul style="margin-bottom: 10px; padding-left: 20px;">
                <li><strong>Export/Import:</strong> Use <i class="fas fa-file-export"></i> and <i class="fas fa-file-import"></i> to save your timeline to a JSON file or restore it.</li>
                <li><strong>Debug:</strong> Click <i class="fas fa-bug"></i> to copy raw graph data to your clipboard for troubleshooting.</li>
            </ul>
        </div>
    `,
    personalInfo: `
        <div class="personal-help-content" style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-id-card"></i> Personal Information Guide</h3>
            <p style="margin-bottom: 10px;">This section tracks the fundamental identity of the Spanner.</p>
            
            <h4 style="margin-top: 10px; color: #fff;">Description</h4>
            <ul style="margin-bottom: 10px;">
                <li><strong>Name:</strong> The character's name.</li>
                <li><strong>Identity:</strong> Pronouns or gender identity.</li>
                <li><strong>Heritage:</strong> Ethnic or cultural background.</li>
                <li><strong>Height & Weight:</strong> Physical stats.</li>
                <li><strong>Age:</strong> Subjective age. <strong>Years</strong> tracks biological age. <strong>Days</strong> tracks accumulated time from spans (when Days reaches 365, add 1 to Years).</li>
            </ul>

            <h4 style="margin-top: 10px; color: #fff;">Locality</h4>
            <ul style="margin-bottom: 10px;">
                <li><strong>Date of Birth:</strong> The objective date the character was born.</li>
                <li><strong>Locality:</strong> Where the character lives/operates physically.</li>
                <li><strong>Society:</strong> Social standing or specific cultural group.</li>
                <li><strong>Grace:</strong> A pool of luck or divine favor used to avoid Span accidents or death.</li>
            </ul>

            <h4 style="margin-top: 10px; color: #fff;">Continuum</h4>
            <ul style="margin-bottom: 10px;">
                <li><strong>Date of Invitation:</strong> The date the character became a Spanner.</li>
                <li><strong>Corner:</strong> The mentor or group that introduced the character to the Continuum.</li>
                <li><strong>Fraternity:</strong> The specific guild or order the Spanner belongs to (e.g., Foxhorn, Engineers). This changes the sheet background.</li>
                <li><strong>Era:</strong> The broad time period the character originates from or identifies with.</li>
            </ul>
        </div>
    `,
    attributes: `
        <div class="attributes-help-content" style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-running"></i> Attributes Guide</h3>
            <p style="margin-bottom: 10px;">Attributes define your character's capabilities. Ratings range from 0 to 10.</p>
            
            <h4 style="margin-top: 10px; color: #fff;">The Core Four</h4>
            <ul style="margin-bottom: 10px;">
                <li><strong>Force:</strong> Physical strength, stamina, and resilience. Determines melee damage and health.</li>
                <li><strong>Analyze:</strong> Intelligence, memory, and reasoning capability.</li>
                <li><strong>Move:</strong> Agility, reflexes, and coordination. Used for initiative and driving.</li>
                <li><strong>Relate:</strong> Emotional Quotient. Social skills, empathy, and manipulation.</li>
            </ul>

            <h4 style="margin-top: 10px; color: #fff;">Controls</h4>
            <ul style="margin-bottom: 10px;">
                <li><strong>Roll:</strong> Click the attribute name button (e.g., "Force") to make a check.</li>
                <li><strong>Change Value:</strong> Click and drag the number spinner <strong>up or down</strong> to adjust the value.</li>
            </ul>

            <h4 style="margin-top: 10px; color: #fff;">Willpower</h4>
            <ul style="margin-bottom: 10px;">
                <li><strong>Temp Will:</strong> Your current mental fortitude. Can be spent to boost rolls.</li>
                <li><strong>Perm Will:</strong> Your maximum mental capacity. Temporary Willpower cannot exceed this.</li>
                <li>If you lower Perm Will below Temp Will, Temp Will automatically decreases to match.</li>
            </ul>

            <h4 style="margin-top: 10px; color: #fff;">Benefits & Limits</h4>
            <p style="margin-bottom: 5px;">Use the text box on the right to list specific perks, flaws, or special traits affecting your attributes.</p>
        </div>
    `,
    goals: `
        <div class="goals-help-content" style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-bullseye"></i> Goals Guide</h3>
            <p style="margin-bottom: 10px;">Goals represent your character's ambitions and drive. They appear in your <strong>Lifeline HUD</strong> for easy tracking.</p>
            
            <h4 style="margin-top: 10px; color: #fff;">Fields</h4>
            <ul style="margin-bottom: 10px;">
                <li><strong>I will... (Description):</strong> The statement of the goal itself. Be specific about what the character wants to achieve.</li>
                <li><strong>Importance:</strong> How central this goal is. High importance goals (Critical, Extreme) appear first in lists.</li>
                <li><strong>by... (Condition):</strong> The criteria for success. What specific event or state must occur?</li>
            </ul>

            <h4 style="margin-top: 10px; color: #fff;">Graph Integration</h4>
            <p style="margin-bottom: 5px;">You can drag a Goal from the HUD onto a Timeline Node to link them, signifying that the event contributes to that goal.</p>
        </div>
    `,
    background: `
        <div style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-book"></i> Background, Gear & Goals</h3>
            <p style="margin-bottom: 10px;">This central section tracks who you are, what you carry, and what you strive for.</p>
            
            <h4 style="margin-top: 10px; color: #fff;">Narrative</h4>
            <p style="margin-bottom: 5px;">Use the large text area to write your character's history. Consider including:</p>
            <ul style="margin-bottom: 10px; font-size: 0.9em;">
                <li>Your mortal life before Invitation.</li>
                <li>Your relationship with your Corner (Mentor).</li>
                <li>The nature of your Junior-level training.</li>
            </ul>

            <h4 style="margin-top: 10px; color: #fff;">Inventory Management</h4>
            <ul style="margin-bottom: 10px;">
                <li><strong>Stuff:</strong> Use this text box for equipment stored at home, safehouses, or generally owned but not carried.</li>
                <li><strong>Assets:</strong> Liquid funds available across your span.</li>
                <li><strong>Gear (Subsection):</strong> Tracks specific items physically on your person. Only items marked as <strong>Carried</strong> count towards your Spanning Weight Limit. Drag items from the compendium to add them here.</li>
            </ul>

            <h4 style="margin-top: 10px; color: #fff;">Goals (Subsection)</h4>
            <p style="margin-bottom: 5px;">Define your character's ambitions here. Goals created here automatically populate the <strong>Lifeline HUD</strong>.</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>Importance:</strong> Setting a goal to "Achieved" archives it. Higher importance goals are sorted to the top.</li>
            </ul>
        </div>
    `,
    spanning: `
        <div style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-bolt"></i> Spanning Guide</h3>
            <p style="margin-bottom: 10px;">Tracks your ability to move through time and the toll it takes.</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>Span:</strong> Your Spanning rank. Determines how far you can span and your maximum span pool.</li>
                <li><strong>Nat Span:</strong> Natural Span. Your innate potential.</li>
                <li><strong>Delib Frag:</strong> Deliberate Fragmentation. Accumulates when you intentionally change history.</li>
                <li><strong>Nat Frag:</strong> Natural Fragmentation. Accumulates from paradoxes or errors.</li>
                <li><strong>Calculated Span:</strong> The summary row shows your remaining Span time based on your history of Span events.</li>
            </ul>
            <h4 style="margin-top: 10px; color: #fff;">Abilities</h4>
            <p>List special techniques or spanning-related skills here.</p>
        </div>
    `,
    metabilities: `
        <div style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-brain"></i> Metabilities Guide</h3>
            <p style="margin-bottom: 10px;">Psychic powers developed by advanced Spanners.</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>Coercion:</strong> Mind control and mental influence.</li>
                <li><strong>Creativity:</strong> Matter manipulation and creation.</li>
                <li><strong>Farsense:</strong> Remote viewing and heightened senses.</li>
                <li><strong>PK (Psychokinesis):</strong> Telekinetic force and movement.</li>
                <li><strong>Redaction:</strong> Healing and biological alteration.</li>
            </ul>
            <p style="margin-bottom: 10px;">Click the button to roll. Use the spinner to set your Rank (0-5). Rank 0 (Latent) cannot roll.</p>

            <h4 style="margin-top: 10px; color: #fff;">Failure Consequences (Backlash)</h4>
            <p style="margin-bottom: 5px;">Failing a Metability roll carries a cost based on the degree of failure (the amount you missed the target by).</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>Pulling (Lower Power):</strong> If you select a Rank <em>lower</em> than your actual Rank, there is <strong>no cost</strong> for failing. It is a "Free Fail."</li>
                <li><strong>Flat Rolls:</strong> If you roll at your <em>exact</em> actual Rank, a failure subtracts <strong>half the failure amount</strong> (round down) from your <strong>Temporary Willpower</strong>.</li>
                <li><strong>Pushing Beyond:</strong> If you select a Rank <em>higher</em> than your actual Rank, a failure results in <strong>IP Damage</strong> (Wounds) equal to the full failure amount.
                    <ul style="margin-top: 5px; font-size: 0.9em; opacity: 0.8;">
                        <li><strong>Standard Failure:</strong> Adds a <em>Bruise</em> wound (non-bleeding).</li>
                        <li><strong>Critical Failure (Botch):</strong> Adds a <em>Bleeding</em> wound.</li>
                    </ul>
                </li>
            </ul>

            <h4 style="margin-top: 10px; color: #fff; border-top: 1px solid #555; padding-top: 8px;">Applications</h4>
            <p style="margin-bottom: 8px;">An Application is a specific, pre-designed use of one or more Metabilities — a spell, technique, or effect you have practiced and defined in advance. Add one with the <strong>+ Application</strong> button.</p>

            <h5 style="color: #ddd; margin-bottom: 4px;">Ingredients</h5>
            <p style="margin-bottom: 5px;">Each Application draws on up to five Metability types as ingredients. Use the small spinners (Coerce / Create / Farsense / Shift / Redact) to set how many points of each type go into the Application. Two limits apply:</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>Per-ingredient cap:</strong> Each ingredient value cannot exceed your Rank in that Metability.</li>
                <li><strong>Volume cap:</strong> The total of all five ingredients cannot exceed <em>(Analyze x 3) - 6</em>. At Analyze 4 this is 6 points total. The <em>used / max</em> counter next to the spinners tracks this live. The row flashes red if you try to exceed it.</li>
            </ul>

            <h5 style="color: #ddd; margin-bottom: 4px;">Level (Lvl)</h5>
            <p style="margin-bottom: 10px;">The Application Level (1-3) is a flat bonus added to the roll Target Number, representing the complexity and power of the effect. Drag the Lvl spinner to set it.</p>

            <h5 style="color: #ddd; margin-bottom: 4px;">Rolling an Application</h5>
            <p style="margin-bottom: 5px;">Press <strong>Apply</strong> to roll the Application directly, with no dialog or modifiers. The roll uses:</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>TN = Highest Metability Rank + Active Rank + App Level</strong></li>
                <li>The <em>active</em> Metability is whichever ingredient type has the highest value in this Application.</li>
                <li>No Push, no Situational Modifier, no Resonance — a clean, fast roll.</li>
            </ul>

            <h5 style="color: #ddd; margin-bottom: 4px;">Running</h5>
            <p style="margin-bottom: 5px;">Check <strong>Running</strong> to mark an Application as active in the background. Running Applications impose a penalty to <strong>Analyze (Mind)</strong> rolls:</p>
            <ul style="margin-bottom: 10px;">
                <li>Apps whose total levels fit within <em>(Analyze - 1)</em> run for free.</li>
                <li>Each additional App beyond that free capacity costs <strong>-1 to Mind rolls</strong>. The penalty is calculated greedily, fitting the largest Apps into the free capacity first.</li>
            </ul>
        </div>
    `,
    experiences: `
        <div style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-history"></i> Ages & Experiences Guide</h3>
            <p style="margin-bottom: 10px;">This is your <strong>Chronology</strong>. It tracks your subjective life path.</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>Ages:</strong> Broad eras of your life (e.g., Childhood, The War).</li>
                <li><strong>Experiences:</strong> Specific chapters or major undertakings within an Age.</li>
                <li><strong>Events:</strong> Detailed moments. Can be normal events, 24h Rests (R), or Spans (S).</li>
            </ul>
            <h4 style="margin-top: 10px; color: #fff;">Controls</h4>
            <ul style="margin-bottom: 10px;">
                <li><strong>Drag & Drop:</strong> Reorder items to correct your timeline.</li>
                <li><strong>Trauma Toggle (😊/😱):</strong> Mark events that caused fragmentation.</li>
                <li><strong>Span Toggle (S):</strong> Marks an event as a time travel jump.</li>
                <li><strong>Link (🔗):</strong> Connects an event to a Spacetime keyframe.</li>
            </ul>
        </div>
    `,
    combat: `
        <div style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-crosshairs"></i> Combat Guide</h3>
            <p style="margin-bottom: 10px;">Manage weapons, armor, and damage.</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>Weapons:</strong> Add Ranged or Melee weapons. Click "Attack" to roll. Stats like Damage, Ammo, and RoF are displayed.</li>
                <li><strong>Armor:</strong> Equip armor pieces. The diagram updates to show total IP protection per location.</li>
                <li><strong>Encumbrance:</strong> Total armor weight reduces your Move attribute.</li>
                <li><strong>Wounds:</strong> Track damage to your body (IP). Mark 'Lethal' for serious injuries or 'Bleed' for ongoing damage.</li>
            </ul>
        </div>
    `,
    theYet: `
        <div style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-hourglass-half"></i> The Yet Guide</h3>
            <p style="margin-bottom: 10px;">Events that you know *must* happen in your future/past because you have already seen the effects.</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>In the Yet:</strong> Description of the required event.</li>
                <li><strong>Frag:</strong> Potential fragmentation penalty if you fail to fulfill it.</li>
                <li><strong>When:</strong> The deadline or specific date it must occur.</li>
                <li><strong>Done:</strong> Mark when you have successfully closed the loop.</li>
            </ul>
        </div>
    `,
    favors: `
        <div style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-handshake"></i> Favors Guide</h3>
            <p style="margin-bottom: 10px;">Tracks social debts and obligations within the Continuum or Leveller society.</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>Favor:</strong> What is owed or expected.</li>
                <li><strong>Importance:</strong> The weight of the favor (e.g., Critical, Minor).</li>
                <li><strong>When:</strong> Due date or collection date.</li>
            </ul>
        </div>
    `,
    relationships: `
        <div style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-users"></i> Relationships & Favors Guide</h3>
            <p style="margin-bottom: 10px;">Manage significant people and the debts between you.</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>Name & Role:</strong> Who they are (e.g. Sibling, Mentor).</li>
                <li><strong>Sphere:</strong> Their social circle (e.g. Professional, Intimate).</li>
                <li><strong>Origin:</strong> When and Where you met.</li>
            </ul>
            <h4 style="margin-top: 10px; color: #fff;">Integrated Favors</h4>
            <p>Each relationship includes a specific <strong>Favor</strong> tracker.</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>Favor:</strong> A specific obligation owed by or to this person.</li>
                <li><strong>Importance:</strong> The weight of the debt (e.g. Critical).</li>
                <li><strong>When:</strong> The due date or collection date.</li>
            </ul>
        </div>
    `,
    landVehicles: `
        <div style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-car"></i> Vehicles Guide</h3>
            <p style="margin-bottom: 10px;">Manage all types of transportation: Land, Air, and Water.</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>Add Vehicle:</strong> Creates a new entry. You can select the specific chassis type (Car, Plane, Boat) from the dropdown.</li>
                <li><strong>Roll:</strong> Click the "Roll" button to make a Move-based piloting check tailored to the vehicle type.</li>
                <li><strong>Stats:</strong> Displays Mass, IP (Integrity), Armor, and Passengers based on the chassis.</li>
            </ul>
        </div>
    `,
    airVehicles: `
        <div style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-plane"></i> Air Vehicles Guide</h3>
            <p style="margin-bottom: 10px;">Aerial transportation.</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>Vehicle:</strong> Select airframe (e.g., Jet, Helicopter).</li>
                <li><strong>Pilot:</strong> Click to make a Move-based piloting check.</li>
                <li><strong>Stats:</strong> Mass, IP (Integrity Points), Armor, and Passenger capacity.</li>
            </ul>
        </div>
    `,
    waterVehicles: `
        <div style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-ship"></i> Water Vehicles Guide</h3>
            <p style="margin-bottom: 10px;">Maritime transportation.</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>Vehicle:</strong> Select vessel type (e.g., Speedboat, Submarine).</li>
                <li><strong>Pilot:</strong> Click to make a Move-based piloting check.</li>
                <li><strong>Stats:</strong> Mass, IP (Integrity Points), Armor, and Passenger capacity.</li>
            </ul>
        </div>
    `,
    gear: `
        <div style="padding: 10px; color: #ccc;">
            <h3 style="border-bottom: 1px solid #555; padding-bottom: 5px;"><i class="fas fa-toolbox"></i> Gear Guide</h3>
            <p style="margin-bottom: 10px;">Manage your equipment and carried items.</p>
            <ul style="margin-bottom: 10px;">
                <li><strong>Items:</strong> Drag and drop items from the sidebar to add them here.</li>
                <li><strong>Bonus:</strong> Some gear provides a bonus to specific Attribute rolls (e.g. +1 Move). Click the item name to roll.</li>
                <li><strong>Carried:</strong> Toggle the checkbox to indicate if you are currently carrying the item. Only carried items count towards weight.</li>
                <li><strong>Weight Limit:</strong> Your Spanning rank determines how much mass you can span with. Exceeding this prevents Spanning.</li>
            </ul>
        </div>
    `
};
