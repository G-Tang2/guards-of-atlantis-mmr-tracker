// Community-written hero strategy guides, sourced from BoardGameGeek and
// pasted in by hand (BGG blocks both its web pages and its XML API to
// automated requests — see the chat with the user this shipped in — so
// this is manually curated rather than fetched). Keyed by hero id,
// matching lib/heroes.ts; not every hero has one yet.
//
// This is prose strategy advice, not rules text — lib/heroCards.ts's
// exact card data is still the source of truth for a card's real
// numbers/effects if the two ever disagree. See app/api/chat/route.ts
// for how this is surfaced to the chatbot.
export const HERO_GUIDES: Record<string, string> = {
  mortimer: `Mortimer is a tanky hero with a posse of undead fans that help him shred his way to success. He is not very mobile himself, but makes up for it by placing zombies on the battlefield that do some of the heavy lifting for him. With a suite of versatile abilities that get considerably more useful as he levels up, Mortimer is a wicked mid-to-late game pusher that can pressure enemies and minions simultaneously. Use his silver to bring fans back from the grave and his gold attack to surround Mortimer's haters, drowning out their screams. Play Mortimer if you want to plan ahead for the long haul, manipulating the board with your undead obstacles to become the true Master of Puppets!

Silver: Awaken!
Place up to 4 Zombie tokens into spawn points in radius, counting spaces adjacent to you as spaces with spawn points; Zombie tokens are not removed at the end of round.

This guide will start with Mortimer's silver as every other card of his only comes online after your zombies have been summoned from the grave. Mortimer can even summon zombies at his feet if there are no good spawn points available. You'll want to do this as soon as possible, but be aware that it may be challenging to do so in the first round while keeping up with other heroes taking minions. Remember, Mortimers zombies are persistent, staying between rounds unlike other tokens. Take into consideration what your future turns will look like and which way the wave is going, as it will inform you where you want to place them so you are never caught without your crew. In fact, thinking ahead will be more integral to Mortimer than almost anyone else as you play each of his cards.

Because this card is also a defense card, building defense can be a good strategy, allowing you to "cheat" out a free action to summon zombies by successfully blocking an attack with it. This can pair quite nicely with his gold for a counter attack against faster heroes. Even if you cannot defend against an attack, you can still discard this silver to summon zombies before being defeated.

Gold: Knife of the Living Dead
Target a unit adjacent to you. Before the attack, Choose up to three times—
>>Move a Zombie token in radius 1 space.
>>Remove a Zombie token adjacent to the target; if you do, gain +1 Attack.

On its face, this is a very simple melee gold with 11 initiative and 4 attack. The reason it is core to your kit is the 2 functions it serves. Mortimer can use this card as a simple repositioning tool to move his zombies into a better position, be it for his other skills or to block a path for enemy heroes. Or, he can have his zombies surround the target to turn this into a 5, 6, or even 7 attack gold that can do as much damage as one of your powerful red cards. A block against a faster attack using your silver can possibly set up 2 zombies to sacrifice right away. Otherwise, think about the placement of your zombies beforehand to maximize this card's threat potential, as you only get 3 Zombie actions to get everyone to their spot on the stage before the attack goes off.

Red — Primary: Walking Dead
Target a unit adjacent to you. After the attack, Choose up to one/two/three times—
>>Move a Zombie token in radius 1 space.
>>Another enemy hero in radius, adjacent to a Zombie token, discards a card, if able; each enemy hero can only be targeted once.

Mortimer's zombies swarm his enemies with this red, acting as a sort of pseudo-ranged ability that can let you achieve multiple discards with one attack and good positioning. Note that you can only make each hero you target discard once; no dogpiling during the concert! While both of Morti's reds are strong attacks in their own rights, the secondary effect of this red cannot defeat an enemy hero, only cause a discard, making it better as a supportive ability that can make an enemy vulnerable to future attacks. To get the most use out of this red, place your zombies in areas where enemy heroes are likely to go, such as next to your own minions.

Red — Alternate: Braains...!
Target a unit adjacent to you. Before the attack, Choose up to two/three times—
>>Move a Zombie token in radius 1 space.
>>If an enemy hero in radius is adjacent to a Zombie token, retrieve a discarded card.

Like any true zombie, Mortimer sustains himself with the brains of others. This ability is a solid self-heal attached to a strong melee attack, making it great for ignoring discards while continuing to take minions and push the wave. Be careful to have a guaranteed target for the attack when you use this red, otherwise a quick disruption from an enemy hero will leave you with no coins, no heal, and a missing defense card. Similarly to primary red, you will want to place your zombies where enemy heroes are likely to go for maximum utility.

Blue — Primary: Morbid Mosh
Choose up to one/two/three times—
>>Move a Zombie token in range up to 1 space; that Zombie token may push a unit or token adjacent to it 1 space.
>>Move 1 space.

When rolling with Mortimer, you better be prepared for a mosh to break out at any time. Friend or foe or even a random rock on the ground, all of it can be shoved around by his zombies. That means this card can help you deny minions from others, save an ally from an unexpected attack, or set up a target for your ally to take advantage of. Mortimer gets in on the moshing himself, able to reposition slightly with any extra choices you might have leftover. To get the most out of this blue, place your zombies in open areas near each other to be able to push from any angle.

Blue — Alternate: Robbing Zombies
Choose up to two/three times—
>>Move a Zombie token in range up to 1 space. Gain 1 coin.
>>Move 1 space.

The rock and roll life doesn't always pay well, so occasionally Mortimer resorts to less noble tactics to skim some extra coins. This is a very simple farming tool that can give you up to 3 extra coins depending on its tier, rocketing you to tier 3 cards quickly in order to get the maximum use of your zombies. If you find yourself in a good position with time to kill, or you only need to move 1 or 2 spaces to get in position, this can be a great way to pass the time and benefit from it. While your zombies don't inherently do anything with this card, you can always use them to wall off your opponents from going where they want to.

Green — Primary: Crowd Drift
Choose up to one/two/three times—
>>Move a Zombie token in range 1 space.
>>Swap with a Zombie token in range.

What concert would be complete without crowd surfing through your adoring fans? Mortimer both loves the attention and desperately needs it, as he has very little movement otherwise. Note that you can repeatedly swap with your zombies, meaning it's possible to chain zombie swaps to get you from one side of the stage to the other with the right set up. To that end, you will want to place your zombies spread out by 3 or 4 spaces and in key locations you want to be, such as next to enemy minion spawn points, to get the most use out of this green.

Green — Alternate: Gathering Horde
Choose up to two/three times—
>>Move a Zombie token in range 1 space.
>>Once per turn: Replace an enemy minion in range adjacent to two or more Zombie tokens with a Zombie token.

The enthusiasm of Mortimer's fans is almost infectious, turning even the enemy minions into lifetime lovers of his music. This green makes up for Mortimers movement by making it so he doesn't need to move at all to push the wave. As long as you have this card available, you can save an attack card either for defense or to use on a hero. In order to get the most use out of this green, place your zombies in groups of 2, with at least one zombie already next to the minion you plan to infect.

Playing As Mortimer:
As a low-movement brawler, positioning for Mortimer is of the utmost importance. Doubly so as you will have to always track your position relative to your zombies at every point in the game. Try to keep yourself in the middle of all the action, within range of at least one of your zombies when possible. With all of your abilities at range and radius 4, try and keep most of your zombies clustered near each other in the center, with 1 zombie closer to the side of the map you think the wave will push towards or 2 zombies if you want to commit more heavily in that direction. Summon any additional zombies only as needed, but do not waste too many turns doing so if you can help it. The only times you should have your zombies more closely packed together are when trying to land a stronger gold attack on an enemy hero, when using your alt green card, or when forming a wall to block your opponents' movements. As mentioned at the beginning of this guide, you will need to think ahead as Mortimer more than anyone else. Take what you have learned about each of his abilities and plan your turns ahead of time, taking note of where things will go to place zombies in critical positions for maximum value.

IMPORTANT NOTE: To keep your zombies around, spare a few of your choices on your primary actions to move zombies off of spawn points before the wave moves there, as spawning minions will remove your zombies.

Playing Against Mortimer:
Mortimer is nothing more than a big melee attack without his zombies. If he is ever spotted out of position, further from his allies (both alive and undead) than he'd like to be, it can be worth it to take an extra action to push him out of range of them to negate his battlefield presence. While it might be tempting to spend an attack to clear his zombies, only do so when it would majorly disrupt his presence in a part of the battlefield you are focusing on or when trading an attack for him to sit still and use his silver for a turn is worth it. It might also be worth adjusting your positioning slightly when playing against Mortimer. His reds, both the discard and the self heal, can only trigger if you are in range of him, regardless of if a zombie is next to you. And if you are scared of being pushed out of position by his blue, find tight corners next to lots of obstacles where his zombies can't get a good angle to shove you from. Mortimer is highly reliant on his primary actions, and any hero that can limit his ability to use them will have an easier time. Because he needs to have a target for his gold and reds to trigger, disrupting his ability to take minions can impact a lot of his ability to plan ahead.`,

  emmitt: `Say hello to Emmitt, the fastest character in the entire game! Wait, that's not right? He has the slowest initiative values and the lowest movement of any character. Or at least that would be the case if the Time Traveler cared to obey the rules of space and time. NO! Emmitt plays by his own rules, and forces everyone else to get involved in his timey-wimey shenanigans as well.

Chaos is inherent to this hero's kit. Many of his abilities will disrupt the battlefield, but be careful not to disrupt your allies as well. While his cards are great at destabilizing your opponents' positioning and stalling for time during each wave, his low movement, double melee attacks, and unreliable silver mean he is better suited to supporting his allies' attempts to threaten kills than pushing the wave himself. Play Emmitt if you want to completely invert the way the game is played and coordinate with your allies to take advantage of the confusion your enemies will feel as a result.

Gold: Reverse Time
Target a unit adjacent to you. After the attack: Next turn: Heroes with lower initiative act before heroes with higher initiative; this effect ignores immunity. (Resolve ties as normal.)

Emmitt makes a powerful swing that shatters time momentarily.

While the rest of Time Traveler's cards are (semi) normal, this Gold changes all of that. To master this card, you will need to think of all your cards in forward time, when initiative flows naturally, and reverse time, sdrawkcab si gnihtyreve nehw (when everything is backwards). Now your blue is your slow getaway card while your green and silver are fast skills. For each of Emmitt's cards, this guide explains their value in both of those initiative orders. What makes his mastery of time such an incredible feat isn't just mastering timing of his own cards, but of his allies' cards as well. It's possible to turn a friendly hero's slow red into a fast, powerful strike, but it can equally trap them in the same scenario with an enemy hero if you aren't careful.

As a point of etiquette, when you trigger Reverse Time and again when people are choosing cards for that round, you should mention it so that all players are aware.

Silver: Unstable Timeline
Place 2 Glitch tokens in radius, with at least 2 spaces between each token; if used as a defense, place 3 tokens instead. An enemy hero in play chooses one of the Glitch tokens; you swap with that token. End of turn: Remove all Glitch tokens.

The timelines are drifting apart, revealing different futures possible to the Time Traveler, but leaving him little control over which one he ends up in.

As a defense card, this is one of your highest defenses in place of blue, and blocking with it allows you to reposition away from danger. You have even less control of where you end up when used as defense card, though, so only block with it when you need to save your red card or have to get out from where you're currently standing. In forward time, Silver can be a slow escape tool that's nearly impossible to chase after. In reverse time, it becomes a way to dodge a suspected attack and reposition to threaten a position and possible wave push. This mobility is unreliable however as an enemy hero has control of where you go, ensuring you will usually end up in the worst of the positions chosen. Thus, getting the most efficient use out of Emmitt's Silver will require placing your Glitches in equally beneficial positions so your opponent has to weigh the options carefully.

Red — Primary: Temporal Slam
Target a unit adjacent to you; when defending, the enemy hero must use the Initiative value of their card and items instead of the Defense value of their card and items.

Overclocking his temporal fist, Emmitt connects various potential timelines to strike at the target where they are the least defended. No amount of armor is strong enough to stop such an attack, so defending heroes are forced to test their reflexes in time by dodging (blocking) with their fast initiative cards instead.

This attack can drastically change how you think about hero combat. The threat alone of a massive attack that can only be blocked by initiative can pressure your opponents into building more initiative in place of defense, putting them in a lose-lose scenario if you also have an ally with a normal high attack red card. Also, whereas most strong red cards will knock a red or even a blue defense card out of your opponent's hand, this temporal sundering will slow them down by instead catching their gold or blue defense cards, but beware going against heroes who can safely discard a fast silver to defend instead. In forward time, this is simply another strong, slow melee red that changes the rules of how you think about your enemy's defensive capabilities. Useful for threatening someone out of position and little else. In reverse time, it will be difficult to guarantee another melee target stays within your reach after an attack with your gold in the prior turn.

Red — Alternate: Flashback
Target a unit adjacent to you. After the attack: You may place 3 Glitch tokens in radius, with at least two spaces between each token; if you do, up to 1 enemy hero in radius swaps with a Glitch token of their choice. End of turn: Remove all Glitch tokens.

Reversing the polarity on his paradox mace, Emmitt is able to afflict an enemy hero with the same temporal displacement that affects him.

Similarly to his own Silver card but in reverse, the targeted enemy will get to choose the most preferable option of the alternate timelines you present them with. At tier 3, you only place 2 Glitch tokens, giving you better odds of putting them into a bad position they really don't want to be in. Note that the target of the attack does not have to be the same target you reposition with this effect. Because this attack comes with an initiative item, in forward time, this displacement tool can be used to set up a slower attack from your allies to smash an unsuspecting enemy like a broken clock, or at least put them into a place where your allies can chase them down. In reverse time, this effect can be used similarly, but instead it will help set up allies' higher initiative attacks and chase cards. In either scenario, the Time Traveller's ability to force enemy heroes to jump to a new timeline is a great way to stop minion takes and attempts to kill your allies while leaving them stranded somewhere they do not want to be.

Blue — Primary: Time Trap
An enemy hero in range who has already resolved a card this turn discards a card, if able.

You would think that, when disabling a time bomb, it is best to act quickly. But once again Emmitt ignores the laws of time in favor of his own rules, wounding those that act hastily without considering the dangers.

In forward time, this can be a tricky card to use, making you have to guess if your preferred target will play a gold or faster blue card in order to trigger your trap. In reverse time, this card can reliably land a discard on those using green cards and slower red cards to move faster in initiative. With the right coordination with your teammates, this can be an effective way to get a discard on an enemy that one of your allies can follow through on when time stabilizes.

Blue — Alternate: Time Loop
Swap with an enemy hero in range who has already resolved a card this turn.

The Time Traveler often uses his chronomancy to slow down and walk in the shoes of others. Sometimes, he just uses it to swap timelines with someone he would rather be.

This card has a few uses as another one of his displacement tools, but in this case you will want to be very aware of not only your enemies positioning, but your own as well. Similarly to his primary blue, this card can reliably take advantage of an enemy playing gold in forward time and green in reverse time, with blues and reds being affected depending on the enemy hero and what items they build. Given the incredible range of 4 on this card, an effective use for it is compensating for your lacking mobility by having your opponents move for you. If you anticipate them moving in the direction you want and at a faster initiative than you, such as if they are heading for the beach after a pushed wave, your temporal swap will make them second guess their planned movement. As with most of Emmitt's cards, however, the best value comes in working together with your allies. If you have a wounded enemy in range, instead of trying to chase after them, you can have your ally come stand next to you in anticipation of your swap, lining up a kill. The tier 3 version of this time altering skill gives you a way to avoid wasting it by stopping actions that have not yet happened and swapping them with a less valuable skill: "An enemy hero in range swaps their unresolved card with one of their resolved cards of their choice."

In forward time, this additional option can stop your opponents' slower reds and green in their tracks, saving an ally from an attack, countering a slow disruption tool, or keeping your enemy from using their green card to escape. In reverse time, you might be able to save an ally from an upcoming gold attack that would finish them off. There are many possible ways to use this secondary effect, such as forcing an enemy to cancel their active effects by swapping into them, but keep in mind that your opponent gets to choose which card they swap into. Thus, the more cards they've already played, the more options you are giving them.

Green — Primary: Fast Forward
Move an enemy hero in range, who remained in the same space since the last turn, 2 spaces in a straight line.

When you have mastered the complex nature of space and time, you might find yourself incapable of waiting for others to take their turns. Instead of waiting around, Emmitt can decide to speed things along by forcing an enemy to jolt forward in time.

In forward time, this skill is best used when you anticipate an enemy will stand still to use their cards, letting you reposition them to your team's advantage. In reverse time, this is yet another very effective disruption tool, capable of stopping a minion take or saving an ally from a precarious position. If you notice your target is "slow" enough in reverse time, you may also be able to use this skill to shift them into range of an ally's attack. Like your alternate blue, this green gets an added effect at tier 3: "Place a unit in range into the space where that unit was at the start of this turn."

This option lets the Time Traveler rewind the clock, forcing those that decided to move without your approval to go back where they started. In forward time, this can stop someone who would normally have enough boots to outrun you or an ally from getting away. It can also, once again, stop them from getting to a minion they were planning to take. In reverse time, it can similarly disrupt an enemy's attempts to get away using their green card specifically.

Green — Alternate: Time Capsule
You, and friendly heroes in radius, may retrieve all cards discarded this turn.

As the turn begins, Emmitt uses his device to take a snapshot of your team's current health state, then can choose to revert to that point in time when this card resolves.

The use for this green is fairly straightforward. In forward time, the turn you anticipate you or your allies in radius are going to be forced to discard by anything other than a slower green, you can play this card to completely undo your enemies' efforts. The more cards you suspect will be discarded in a turn, the more valuable it becomes. In reverse time, this card can ONLY undo an enemy's slow green, making it far less valuable until it is upgraded to tier 3: "This turn: Friendly heroes in radius are immune to enemy actions."

What could be better than healing your allies after an attack? Them never being attacked at all! Now, in reverse time, you can save your allies not only from attacks, but from any and all negative effects and disruptions possible. Your friendly heroes will be more than grateful to be able to safely take the actions they want without worrying about your opponent's moves… besides their greens. Of course the downside here is that it only saves your allies; you will not be safe in the same way. If you can master your timings the same way Emmitt does, this card will be almost impossible to counter.

Playing As Emmitt:
If you want to truly master time and save the fractured timelines, it won't be enough to perfect your play pattern around your own gold. The best Emmitt players will learn how to master his interactions with his allies as well, knowing just when to trigger reverse time and use his skills to help your teammates secure kills. Your Silver is easily your best mobility tool despite being less reliable, but it is also one of your highest defenses and a good escape tool in case of danger. As long as it is in your hand, you are a very safe hero in most situations, so be careful to use it when you really need to reposition while keeping your other cards available. Although it may not be your best use of Silver, the Glitches you place with it do remain until the end of turn, possibly blocking off paths your enemies were planning to take.

Make sure to track what cards your opponents have used. Without their red and green cards, they won't be able to move as quickly in the initiative order in reverse time, leaving them vulnerable with the right set up from your allies. As a hero with up to three different disruption tools, you should plan ahead on your use of your Gold in order to narrow down the many possible futures, giving you the best chances of using the right tool for the job to stall the wave and help your allies. Because of this, using your Gold on turn 2 or 3 can be much more effective than opening up a round with it.

Emmitt is pretty safe against other brawlers, but loves nothing more than to have another brawler on his own team to take advantage of their slow, powerful attacks in reverse time. Against faster heroes, Emmitt can forget about using his primary Red, and instead focus on waiting out their Green card to allow an ally to catch them in reverse time with no chance of escape.

Playing Against Emmitt:
Emmitt is very effective at disrupting the plans of others, but he is equally susceptible to being disrupted himself. If you can force him to block with his Silver, you can put him far out of position with fewer ways to impact the battlefield. Remember that he needs to have a target for his gold to trigger reverse time, so denying such a hit can turn him into a far less effective support brawler. Be careful not to expend your slow mobility cards too soon against him, as they will be your saviors when reverse time activates. At the start of the game, try to think about which cards will be better when the initiative is reversed, and try to keep those cards in hand for when Emmitt's gold inevitably goes off.`,

  sabina: `Sabina has made a name for herself commanding forces in the ongoing skirmishes between Titans and Atlanteans. Despite her accolades, she knows better than anyone that she is nothing without her fellow soldiers. Alone, she will fall, but together, her allies will claim victory. Follow this mantra as you wade into battle, for the Commander is at her most effective when nearby her friendly minions. With multiple battle plans and weapons capable of making her opponents second guess each move they make against your comrades, Sabina is an adept pusher that will need to read the direction of each push carefully to ensure she keeps up the pressure. Play Sabina if you want to be a tactical gunslinger that dominates ranged combat while playing chess with ally minions.

Gold: Point Blank Shot
Target a unit in range. After the attack: If the target is adjacent to you, push it 1 space.

Sabina is used to betrayal, so she prefers to keep people at arms length, or bullets length in this case. Even in close quarters, she wants to remind others how dangerous she can be.

It's hard to over-examine this card, but in essence, this is a safety net for your ranged gunplay that allows you to take a shot at adjacent enemy heroes and push them away before they can tag you with an attack in return. Being able to push enemy soldiers at a very fast initiative can both deny attacks or set up an ally's action against them as well, so keep an eye out for any opportunities that present themselves. Grabbing a ranged item makes this an effective finisher as well, but note that the push only occurs if the target is adjacent to you.

Silver: Back to Back
Swap with a friendly minion in radius.

Despite her past, Sabina knows her skills remain in leading others, and any good leader will rely on their comrades to cover their six.

Even without boots, this silver card can allow the Commander to reposition at a moderately slow initiative, but only if she has a friendly minion within her radius of 2. Remember for most of these cards that they cannot interact with the heavy minion until it is the last one remaining. If played proactively, Sabina can cover her friendly minion by moving them away from an enemy hero that was intending to use an attack on them.

Red — Primary: Gunslinger
Target a unit in range. +3 Attack if the target played an attack card this turn.

Sabina dons her old title of Gunslinger, quick drawing on her enemies with a powerful shot that will leave them shaking in their boots.

Even without items, this is a deadly attack card with a decent initiative, but only if you can anticipate your opponent's actions. Playing this card when you can be fairly certain an enemy hero in range will play an attack card can take out their higher defense card or even net you a surprise kill. The bonus attack damage will trigger so long as an attack card was played, whether or not they went first in initiative or even used it to attack.

Red — Secondary: Shootout
Target a unit in range. After the attack: If the target was adjacent to you, remove up to one enemy minion adjacent to you.

Even when the Commander is caught without her friendly minions backing her up, she keeps a level head. She might be outnumbered, but that doesn't mean she's outgunned.

Sabina's primary red is far more enticing in most cases for its straightforward effectiveness, but don't discount this upgrade path. Right from tier 2, it can take up to 2 minions with one attack, and up to three minions at tier 3. Remember two things: first, the initial target doesn't have to be a minion, it just has to be adjacent; and second, remove is not the same as defeat, so you won't get the coins for those additional takes. Because you can take multiple minions with one card, it's possible to get three minions in one round with the right setup, but more likely this will simply save you a gold attack card to use some other way. Be careful not to leave yourself vulnerable when you use this attack, as it is your highest defense card and requires you be surrounded by minions that reduce your defense further. BUT, so long as you go before an attack aimed at you, you can clear out the surrounding minions to gain a better chance at survival.

Blue — Primary: Roger Roger
Swap two minions in radius.

Sabina knows which soldier belongs where on the battlefield, and can even command her forces to take enemy positions, forcing them into the killzone.

This blue card is your fast minion repositioning tool. While you can use it to swap a melee minion with a ranged minion to change minion defense modifiers in hero combat, this card's best use is to swap a friendly minion with an enemy minion. This accomplishes a few things. It moves an allied minion away from an enemy attack, sets up an enemy minion for your team to take, turns a positive defense modifier into a negative one, and vice versa. At tier 3, you can swap with a heavy minion even while it's immune, giving it lots of versatility in battle.

Blue — Secondary: Steady Advance
If there are two or more friendly minions in radius, you may retrieve a discarded card; if you do, you may move 1 space.

The Commander stands before her army, waving her banner, boosting her squad's morale, and pushing forward into enemy lines!

Sabina is not known for her great defenses, and a heavy blow can cause her to lose her valuable red card if not take her out in a single strike. With this blue card in hand, losing that red attack will be a little less demoralizing as you can heal it back later so long as you are positioned near your friendly minions. It also grants you a small bit of movement when you heal, letting you step away from danger and into a better position to turn heel and go on the offensive.

Green — Primary: Marching Orders
Move a friendly minion in radius 1 space, to a space in radius. May repeat once.

A sound battle plan is of the utmost importance to carve a path towards victory. Aware that no plan survives first contact with the enemy, Sabina has formulated multiple plans to put into motion in reaction to her enemy's plays.

Mirroring your primary blue, this card functions as a slow repositioning tool, but only friendly minions will follow these orders. Since it will often be one of the last actions taken in a given turn, it's better used in reaction to the enemy team's actions, such as when they plan to move into position for a minion take so your friendlies can sneak away right under their noses. You can also use this card supportively by moving minions into position to affect the defense bonus of your allies or of an enemy hero.

Green — Secondary: Close Support
An enemy hero in radius adjacent to your friendly minion discards a card, if able.

You cover your friendly minions by unleashing a salvo against those approaching their position.

Unlike Sabina's primary green path, this card cannot guarantee your friendly minions' survival, but it can punish your opponents for going after them. If you suspect that an enemy hero plans to move in next to a friendly minion or will remain next to one by the time this triggers, you can unveil a threat that will have them second guessing their decision. Should they approach your friendly minions anyway, you can follow through on the discard to secure a kill, and if they don't, you can ensure your team has an advantage on pushing the wave. A tier 3 defeat can even pick off someone that found themselves unluckily stunned next to one of your minions.

Playing As Sabina:
As the Commander, you will want to be near your friendly minions as much as possible, as all of your skill cards become pieces of cardboard with some movement without them. Read the wave carefully, and don't get caught out of position when it pushes into a new zone. While a few of your cards can secure kills very effectively, especially with a ranged item, your best strategy is to deny enemy heroes minions as much as possible and force them to step into a bad position as they try and win the wave.

Your primary red will better suit an aggressive strategy of threatening your opponents out of using their attacks and punishing them when they do so. Meanwhile, your alternate red can give you a better guarantee of winning each push through brute force, but it will rely on your positioning and use of your primary green and blues to get the most effect. So long as her gold card is in hand, Sabina is fairly safe from most melee attacks, but avoid getting caught by strong hits that can force you to drop your red card unless you have your alternate blue available to recover it later.

Playing Against Sabina:
Sabina has far less options available to her when she is not nearby her friendly minions. At the end of each wave, when minions have been depleted, she will be more vulnerable. Likewise, if you can threaten her away from her minions, she will have fewer tools to counter your team. Melee heroes have a rough time facing off against the Commander, but if you can position yourself in melee next to her with an obstacle at your back, you can avoid getting shoved away by her gold attack, letting you more safely play your attacks. Striking Sabina with a strong attack can be more valuable than on most, as her red card is one of her most versatile tools and has far more defense than any other card available to her. Without it, she will have to play much more carefully in her attempts to help push the wave.`,

  wasp: `The warmaidens of the Gilded Empire must prove their mettle upon the battlefield, learning to harness their electromagnetic abilities before claiming their right to the throne. As one such heiress, Wasp has built a shock pack that she uses to channel her powers and enhance them. In combat, she is a crowd control specialist that can rearrange and halt the movements of enemies around her. Her high voltage tactics can lead to a number of incidental discards on her enemies as electricity arcs between one target and the next to deliver a powerful shock! Play Wasp if you want a versatile hero that can shutter enemy attempts to find advantageous positions in combat.

Gold: Magnetic Dagger
Target a unit adjacent to you. After the attack: This turn: Enemy units in radius cannot be swapped or placed by themselves or by enemy heroes.

Wasp discharges electricity from her shock pack that clings to enemy heroes, grounding them and leaving them unable to use specialized mobility.

Other than being a simple fast attack to threaten finishers on enemy heroes, this card can be useful for disabling enemy heroes and stopping any easy attempts at escape. However, this additional function can be difficult to land as you have to have an attack target and anticipate an enemy player's plan to use a swap or reposition effect advantageously, both on the same turn. If you find an enemy hero is backed into a corner with no easy way to get out using basic movement, a smart use of Wasp's dagger can eliminate any remaining chance they had of escaping.

Silver: Static Barrier
This turn: While an enemy hero outside of radius is performing an action, spaces in radius count as obstacles. While an enemy hero in radius is performing an action, spaces outside of radius count as obstacles.

The Warmaiden produces a high voltage field that forms a dome around her, trapping those inside and keeping out enemies that planned to move in on your location.

This more than anything else displays the Warmaiden's ability to disrupt enemy positioning on the battlefield. Enemies outside of the barrier can move around (and with certain skills, over) the dome, but at radius 2, such a large obstacle will greatly reduce the options they have for moving in on the targets they hoped to interact with. Those inside the radius are even more restricted, only able to move within a limited area, likely pushing them to engage with you if they have no other good target. Note: Wasp's silver does not necessarily stop units from being targeted by enemy heroes on the opposite side of the barrier, meaning they can still be targeted by attacks and similar effects.

Red — Primary: Electrocute
Target a unit adjacent to you. After the attack: An enemy hero in radius and not adjacent to you discards a card, if able.

Harnessing incredible electric potential, Wasp unleashes a powerful lightning strike that cannot be contained, arcing to a separate target before dissipating.

Staying on Wasp's primary red gives her much better brawling capabilities. This attack is a great way to get incidental discards just for doing the things you already planned to do. Nothing is more straightforward than striking a target and noticing an enemy hero is nearby to force a discard. By using this card early to hit an enemy hero and catching a different enemy hero in the radius, you can give your team options for who to pursue later in the round. At tier 3, the added discard can also defeat an enemy, giving it the added utility of finishing off an enemy with no cards left so long as you have a melee target available.

Red — Alternate: Charged Boomerang
Target a unit in range and not in a straight line.

The cables surrounding Wasp whir with energy as they charge up the boomerang in her hand, turning it from a simple hunting tool into a deadly lightning bolt.

The Warmaiden's alternate red path turns her into an effective sniper that will shock enemies ill-prepared for its incredible range. The only stipulation is that you have to curve the attack, like a boomerang, and cannot target enemies straight ahead or adjacent to you. Try to establish forks (multiple targets) by positioning at odd angles near the action, but far enough away to be safe from retaliation. At tier 3, these forks will be especially useful as hitting a hero lets you repeat the action against a different target available to you.

Blue — Primary: Control Gravity
Move a unit, or a token, in radius 1 space, without moving it away from you or closer to you. May repeat once on the same target.

Overloading her shock pack, Wasp creates an electromagnetic gravity well around which other objects orbit.

Further contributing to the Warmaiden's tactician capabilities, her primary blue is a great method for repositioning all sorts of obstacles, although you are limited in the directions you can move them. This can be a great tool for setting up non-straight lines for your alt-green and alt-red. It can also move tokens to block movement or set up other effects depending on the token's source. More often than not, you will use this skill to set up an attack for your ally or take a target away from your enemies.

Blue — Alternate: Kinetic Repulse
Push up to 2 enemy units adjacent to you 3 spaces; if a pushed hero is stopped by an obstacle, that hero discards a card, if able.

Mastering her powers on an atomic level, this heiress to the Gilded Empire has learned how to shift the polarity of those around her. Any foe that gets too close is magnetically repelled away from her in the blink of an eye.

At first glance, Wasp's alternate blue seems like a simple defensive card, allowing her to push attackers away instead of giving up the position she currently has. In reality, this card is extremely versatile against enemy melee combatants because of its ability to force discards as well. In a congested part of the battlefield, it will be very easy to find an obstacle within 3 spaces to slam your opponents against. Furthermore, a sneaky use of this blue is to push enemy minions, not just to avoid defense penalties but also to pass a minion to an ally hero who would otherwise have a hard time getting a minion kill.

Green — Primary: Deflect Projectiles
Block a ranged attack; if you do, an enemy hero in range, other than the attacker, discards a card, if able.

Metal matters minimally to the Warmaiden. Like Magneto, she can stop projectiles in mid air and turn them against surrounding enemies.

Auto blocks are a powerful thing to have, especially on a green card which otherwise has very little defense. In this case, Wasp becomes immune to all ranged attacks so long as her primary green is in her hand. Specializing in this way comes with the added advantage of turning an attack against the enemy team. At tier 3, you can even force the attacker who dared target you to discard, ensuring the enemy heroes will think twice before attacking you. Sometimes, simply having this card in hand is enough to make dedicated ranged heroes avoid you, but remember that this only works against ranged, so think about who is your biggest threat on the battlefield and if it's worth committing your upgrade in this way.

Green — Alternate: Telekinesis
Place a unit or a token in range, which is not in a straight line, into a space adjacent to you.

It is true that opposites attract, or at least that's true for protons and electrons. Rather than using her electromagnetism to repel foes, Wasp can use it to pull others in for a big embrace.

Yet another way to mess with the position of units on the battlefield, but in this case it is not only your enemies that can be affected. Unsuspecting enemy units can be pulled in to set up a gold or red attack in the next turn. Meanwhile, allied units can also be drawn in, whether it's to bring them away from danger and into safety, or to pull low mobility allies closer to the action. Similarly to alt red, you need to think a bit skewed about your position to ensure your targets do not end up in a straight line.

Playing As Wasp:
When piloting the Warmaiden, consider your upgrades carefully as your choices will drastically change your playstyle. She can be a versatile character with lots of possible play patterns, but she can never do it all at once. This is mainly defined by your choice of red card. With primary red, Wasp is much tankier and becomes a sort of support brawler that can get off discards easily to allow her team to threaten or finish enemy heroes. Use the rest of her skills to stay alive while setting up discards and limiting enemy heroes' ability to escape.

When on her alternate red path, Wasp becomes more of a ranged assassin capable of tagging enemies and taking minions from safety. Without a high defense or defensive items, you'll want to be careful not to be caught off guard by strong attacks that can defeat you in a single blow. Use your skills to position enemy heroes in vulnerable places and set up forks where you can secure kills or, failing that, take minions to keep up pressure.

Playing Against Wasp:
Be aware of what upgrade paths Wasp is currently on. When she is on her primary red, her discard effect can be easily disrupted by taking away the target she planned to strike. If you see her swap to her alternate red or even her alternate green, try to use your movement and skills to keep yourself in a straight line with her. Pressuring her into the center of action can limit the effectiveness of her long ranges that usually allow her to stay away from danger.

Stay aware of her silver and gold lockdowns as well. Her silver is difficult to dodge, but can be ignored so long as you end up on the preferred side of her radius of 2 or if you have a skill you can use instead of moving. Wasp's gold is far easier to avoid, only being something to track if she has a target in melee reach and your team has special repositioning skills they intend on using that turn.`,

  tigerclaw: `Stalking the back alleys and royal markets of every city he passes through is Tigerclaw, the Cutpurse. Every day on the streets is a struggle for survival, and he is willing to resort to every dirty trick available to make a little extra coin. It's obvious Tigerclaw hasn't joined this conflict for any selfless reasons, but that won't stop him from using every tool he's got to help his allies.

Tigerclaw, the Cutpurse is a slippery hero who never stops moving, whether they are dashing through their enemies using their gold or avoiding danger by hiding away in the shadows with their silver. Even their primary red card allows them to stay on their toes while attacking. Play Tigerclaw if you want to be an evasive hero capable of dodging attacks and debilitating enemy heroes from safety. With your incredible initiative and mobility, you will be your team's most effective initiator and finisher, all in one devious package.

Gold: Blink Strike
Before the attack: Move 2 spaces in a straight line through an enemy unit; target that unit.

In the blink of an eye, Tigerclaw cuts through an enemy, leaving them no time to react.

Very few heroes have an attack that goes at 13 initiative, meaning you will have priority in most circumstances before initiative items can challenge your speed. This will give you an easier time farming minions uninterrupted and securing kills at the end of each round. Because you have to dash through the target first, you can dodge away from threatening enemies near you, but avoid positions where your attack angle can be blocked or you can be threatened after the dash.

Silver: Blend Into Shadows
If you are adjacent to terrain, place yourself into a space in radius; if you do, Next turn: You are immune to enemy attack actions.

The outskirts of dense cities and dusk-colored fields are where the Cutpurse prowls confidently, unafraid of the unobservant eyes of his pursuers.

Many heroes have silvers that are useful but which are not intended to be used each round. This is not that silver. You should be trying to use this card on most rounds, and therefore should try and stay near terrain to leap off of. Because you are immune to attacks in the turn after using this card, think about what action you want to use knowing you'll be safe doing so, although you can still be disrupted by other methods.

Red — Primary: Combat Reflexes
Before the attack: You may move 1 space. Target a unit adjacent to you. After the attack: If you did not move before the attack, you may move 1 space.

Tigerclaw stays nimble on his feet, weaving in and out of combat as he engages and retreats again and again, leaving his foe no time to counterattack.

Acting as a pseudo ranged attack at a high initiative, this upgrade path gives you more control of who you target after cards have been revealed. If you are a step away from a target and there are no cards threatening your attempts to move in for the kill, you can safely move in to strike. If you are next to a target and are being threatened with retaliation, you can strike first then move away from the danger afterwards. At tier 3, you can move in and out simultaneously, giving you a very flexible 2 movement for repositioning and dodging enemies alongside your attack.

Red — Alternate: Backstab
Target a unit adjacent to you; if a friendly unit is adjacent to the target, +2 Attack.

Spending a lot of time in unscrupulous and shady taverns, Tigerclaw is used to causing a few bar fights as a distraction. When his target's eyes are turned away, that's when he makes his move.

While Tigerclaw's kit makes him heavily designed for evasion and sneak attack tactics, this path changes that by making him more of an active threat in melee. While on this red, you have higher attack and defense at the cost of additional mobility, but with the same incredible initiative. For maximum threat potential, look for opportunities where you think an enemy hero is lining up to take a friendly minion with an attack slower than yours, or coordinate with your team to flank a target that is missing a method of escape.

At tier 3, Tigerclaw swaps out his dagger for a ballista he was hiding in his pocket… This doesn't do much without a ranged item paired with it, but don't discount the extreme tactical advantage of a high initiative, highly threatening attack that can be done from a safe distance.

Blue — Primary: Sidestep
Block a ranged attack. You may move 1 space.

Is it redundant to say that Tigerclaw has cat-like reflexes? Maybe, but it's certainly true. The Cutpurse is so used to avoiding danger that he can do it with his eyes closed.

Your choice of blue may greatly impact your playstyle as Tigerclaw. Between your silver, your high mobility, and your top-tier initiative, you won't often need to worry about getting caught by intimidating melee attacks, making your ranged block card an easy choice in most circumstances. Simply having this card in hand can encourage ranged heroes to ignore you for more favorable targets. At tier 3, this deterrence is further compounded by the fact that you can freely recover your silver card after the block. When you're mainly only worried about ranged attacks, stick to this path and use that silver early and often to maximize your safety each round.

Blue — Alternate: Parry
Block a non-ranged attack. The attacker discards a card, if able.

With a flash of his curved blades, Tigerclaw catches his pursuer's blade, twists, and turns it against them.

There are mainly two scenarios where you will want to hop onto your melee block path. Either the most threatening attacks on your opponents' team are all melee, such as against high initiative heroes like Razzle or pseudo-ranged attacks like Brogan's charge, or you yourself want to get more involved with challenging melee brawlers. Despite otherwise being an easy target for powerful attacks, this blue card can make intimidating bruisers second guess their strategy as you not only parry their assault but riposte and force them to discard as well.

Save your finishing blow until after they attack, either later that turn if they hit with gold or in the next turn if they hit you with a slower attack. This way you can injure them first then follow up with the right cards to finish them off.

Green — Primary: Pick Pocket
Move up to 2 spaces. Take 1 coin from an enemy hero adjacent to you; if you do, you may move 1 space.

Tigerclaw is great at making enemies of friends, with one hand on their shoulder and one hand in their pockets.

This is easily one of the best farming cards for its ability to give you coins, deny level ups from enemies, and threaten doing both in a wide area around you. Having movement attached to your ability to farm essentially means you can do what you were already planning to do (move around for better positioning) and make money doing it.

Green — Alternate: Poisoned Dagger
Give a hero in range a Poison marker. The hero with a poison marker has -1 Initiative, -1 Attack, and -1 Defense.

Those that make an enemy of the Cutpurse have a habit of becoming sluggish and feeling brittle after the encounter, although who can say why?

Instead of debilitating enemy heroes by stopping level ups and denying item upgrades, you take the direct approach by applying a flat penalty to the three main stats of any enemy that gets too close. Similar to Bain's bounty, this marker puts a target on the back of an enemy hero, drawing your allies' attention to the weakened foe. This can be an effective way to keep parity with another fast hero that's giving you a challenge. Be very aware of who you place this marker on, since forgetting to tally the penalties into your damage calculations can cost you a kill.

Playing As Tigerclaw:
As an initiator, you should be looking for opportunities to weaken enemy heroes where possible. Use your gold within the first 2 turns to apply an early injury to a vulnerable hero, or use silver or green on turn 3 to set up a gold on turn 4 and finish off a previously injured hero. Between your silver and green cards, you have a lot of ways to move at low initiative so don't shy away from opening a round with one while saving the other for the right moment. Remember that for your silver, walls are your friends… and waves as well.

The common play pattern for Tigerclaw is move>attack>move>attack or attack>move>move>attack, which is the common play pattern of every hero but no one does it with more evasiveness than the curious cutpurse. As your blue card is your best deterrence against attacks, only move with it when required; such as to dodge an attack, ironically. When you first start playing as Tigerclaw, remind yourself to stay safe, stay flexible, and stay deadly.

Playing Against Tigerclaw:
First and foremost, keep track of Tigerclaw's blue card and whether or not you have a favorable matchup against it (ex: they have their ranged block and you are a melee hero). If the matchup is unfavorable, you will need strong coordination from your team to punch through their defenses and threaten them. A crucial tip for keeping Tigerclaw on their toes is to limit their access to terrain through the use of tactician heroes that can move them away from walls and negate their silver. Without attack immunity, the Cutpurse is much more vulnerable, but remember that even if you can't stop their silver, it's still only an attack immunity, leaving other methods of discard and disruption as fair game against them. Another way to counter them is by taking advantage of their gold card, either by backing up against an obstacle if you are the target, creating an obstacle behind their target, or setting up to target them after they dash through their target. In any case, they are the fastest hero in the game. Unless you are building a lot of initiative, do not plan to outspeed them, plan to outmaneuver them.`,

  dodger: `Many study the ancient civilizations from which the Titans and Atlanteans carved their names, hoping to reveal the secrets to power they have kept locked within their vaults. There is a darker side to the gifts these societies can bestow, and it is this sort of magic that Dodger has bartered her very essence to obtain. Her willingness to gain power through ambition and sacrifice has led her here, to the battlefield upon which she can more practically test the bounds of her pact.

Dodger, the Warlock is easily the most complex of the core seven, with a kit suited to taking advantage of weaknesses. As more minions are culled within the battle zone, Dodger's abilities become empowered and menacing, such as giving her gold attack more targets to strike. However, her daemonic pact has left her body frail, and so she much prefers using cards like her silver to force enemy heroes to discard early and put them on the back foot before they can threaten her. Play Dodger if you want a menacing hero who seeks to control each wave precisely and force foes to come to terms with their cruel end at your hands. Even more so than other high initiative heroes, she specializes in preying upon weakened heroes to finish them as the round comes to a close.

Gold: Dread Razor [Attack]
Choose one —
>>Target a unit adjacent to you.
>>If you are adjacent to an empty spawn point in the battle zone, target a unit in range.

The souls of the dead fuel your chakram, allowing you to toss it at high velocity and continue your bloodshed.

Dodger is an entirely ranged hero, but they can't always access this range unless they meet certain criteria. In the case of her gold card, that criteria is having an empty spawn point adjacent to you. This can easily be obtained by defeating a minion or waiting for another hero to do so. Having a high initiative ranged attack makes weakened foes dread finishers from the Warlock. As a result of this fact and Dodger's low defenses, it can sometimes be valuable to take a minion and clear a spawn point with your red while holding onto your gold to dodge or threaten an attack late in the round.

Silver: Death Trap [Skill]
An enemy hero in radius who is adjacent to an empty spawn point in the battle zone discards a card, if able.

You awaken the restless souls of the dead, goading them into lashing out at the living that surround their graves.

Silvers like Dodger's can often define a hero's playstyle. In this case, your silver directs you towards eliminating heroes as a primary strategy, and is best used earlier in the round to put your opponent on the back foot. Since you don't have very high defenses, injuring your opponent before they injure you can be a good way to stop them from coming after you, and it saves both of your attacks to follow up or take minions more securely. Use this card when enemy heroes plan to take a minion to force them to either stall or take a discard.

Red — Primary: Finger of Death [Attack]
Choose one —
>>Target a unit adjacent to you.
>>Target a hero in range who has one or more cards in the discard.

Your daemonic pact requires sacrifices. Better that those sacrifices come from weaklings than from someone with as much potential as you.

This card is far weaker for pushing until tier 3, only being capable of taking minions adjacent to you, thus forcing you into positions where your defenses may be even lower than they already are. But for the purposes of securing hero eliminations, this card is amazing. Between your gold and silver, you have a lot of easy ways to get discards on heroes early, but neither of those cards are strong enough to truly threaten a kill. This card comes in with not only a decent attack value, but after upgrading to tier 2 it also has sniping range against injured enemies, making it extremely easy to follow up for a finisher on turn 3 or 4.

Red — Alternate: Burning Skull [Attack]
Target a unit in range. After the attack: Move up to 1 minion adjacent to you 1 space, to a space not adjacent to you.

Shadowy flames form around your past victim's remains, frightening those that bear witness to your terrifying display of power.

Unlike Dodger's other attacks, this one has no stipulation to be used at range, making it far more reliable and allowing you to position better when taking minions. If you do end up next to minions, however, it gains much more utility. The push effect can let you clear spawn points to activate your other abilities, pass minions to ally heroes who are just out of reach, and even take minions away from enemy heroes if done at the right angle. Because you have one of the fastest red cards, you can also push enemy minions away from you just in time to avoid any defense penalties when defending against an enemy hero's counterattack.

Blue — Primary: Vampiric Shield [Defense]
+2 Defense if there are 2 or more empty spawn points in radius in the battle zone.

You leech blood from the recently departed, forging it into a shield to protect yourself with.

On this path, your second highest defense card is also your highest defense card! This makes the Warlock a bit more durable in the middle of things, standing their ground against heavy onslaught so long as they have empty spawns nearby. In order to ensure you have that defense boost, keep yourself near the bulk of the minion spawn points closer to the middle or end of each wave. Look for opportunities to stay next to an enemy minion and within radius of an empty spawn point so that you can use either gold or red to open up the second spawn point before an attack finds its way to you.

Blue — Alternate: Weakness [Skill]
This turn: Enemy heroes in radius have -4 Attack.

You sap the strength from the muscles of heroes around you, making their attacks feeble and insignificant.

While you can certainly use this card to reduce the potency of an incoming attack, it is better to simply dodge the attack if you are going first, unless you specifically need to remain in the spot you are in or can't get out of range. Instead, this is a support card that sacrifices the potential defense of Dodger's primary blue for the ability to save allies being threatened by stronger golds and reds. The large radius means you don't have to be in the midst of the action to get value and can instead focus on other goals while helping save your team. Remember that your allies will still need to discard as even 0 Attack can get a discard out or take a minion. Look for moments where multiple strong attacks are being levied against your team or when an ally cannot survive an attack without your support. You can bargain with your fragile, insignificant allies to safely use one of their strong attacks while you cover their back from an enemy's.

Green — Primary: Darker Ritual [Skill]
If there are 2 or more empty spawn points in radius in the battle zone, gain 2 coins.

This is no meditation, but instead a communion with your dark master to bargain for further power. In exchange, you must offer departed souls for his consumption.

Dodger's ambition leads her to lust for power and even disturb the dead if it gives her any advantage over her enemies. In this case, that advantage comes in the form of coins she can spend to get ahead of other heroes in level. If you find yourself at the end of a round and already in a good position, spam this card to accelerate far ahead of the rest.

Green — Alternate: Necromancy [Skill]
Respawn a friendly minion in an empty friendly spawn point adjacent to you in the battle zone.

Anyone can kill the living with enough effort and motivation. Very few can master undeath such that they can bring an ally back from the grave.

Many heroes have a method of taking an extra minion. Only Dodger has a way to bring them back. The downside of doing so is that you offer your opponents more chances to take minions and get additional gold each wave. However, the upsides are well worth it, allowing Dodger to better control the wave and stall it in order to let it last longer before the push, giving you more empty spawn points for longer. Reminder that the spawn point must be a friendly one.

Playing As Dodger:
Whether or not you choose to follow through or merely scare off enemy heroes, your goal as Dodger is to make them discard early in each round, preferably with your silver. Because most of your abilities rely on having empty spawn points (in the battle zone) available to you, you will be at your best inside of the battle zone near the action, but not so close that you find yourself surrounded. Track the waves and calculate the minion battles to see where the battle zone will go so that you can spend the least amount of time outside of the battle zone. Use your primary green to make coins while you focus on attacking heroes instead of minions, or your alternate green to more directly control the waves so that they last longer.

Your mighty warlock abilities will be most oppressive if you can keep up the pressure round after round, so spending more time in the end of each wave where there are more minion spawn points will benefit you greatly. Dodger also enjoys having ally heroes that can easily get the blood flowing to set her up for the death knell. Remember that you are the reaper upon the battlefield, and others should fear the danger you present at all times.

Playing Against Dodger:
Despite her menacing nature, Dodger is quite frail, with few ways to avoid death outside of running away. Without their primary blue, they are severely lacking defenses, so pay attention for when they swap to their alternate blue or when they are out of position with less than 2 spawn points within their base radius of 2. Out-pressure them with aggressive tactics while keeping yourself safe in order to limit their threat potential. Avoid standing next to empty spawn points when possible and giving her easy triggers on her silver card, as that is the easiest way for her to apply pressure without spending more valuable cards.

Once you already have a card in your discard, you have to be extremely careful near Dodger, doubly so if she is on her primary red path. At a base range of 3, she can often save that attack until turn 4 to finish you off with ease. Either avoid her entirely and move to another part of the board if you can, or look for a way to heal your discarded card. Another way to counter the Warlock is by sanctifying the cursed grounds she seeks to disturb with her dark magic, which would mean replacing those empty spawn points with tokens from token heroes such as Mortimer, the superior necromancer.`,

  brogan: `Raiders are at home on the battlefield, any battlefield, where the war drums bellow and steel rings out in a chorus of violence. It is here that Brogan can be found, whether he is of sound mind or had one too many flagons before starting a brawl. In the heat of the moment, this brute can be the tip of the spear or the shield that weathers every blow.

Brogan, the Destroyer is the ultimate tank of Guards of Atlantis, nigh-unkillable and great at applying pressure in an area. Brogan has some of the most deadly attacks and toughest defenses, but he is slow, like that of a lumbering giant. He has attacks that help him make up for his sluggishness such as his gold card, which sends him crashing forth into the space of a slain enemy to continue his rampage. What makes him truly unkillable is his silver's entrenching effect, making him stand still like a tower and healing damage previously sustained. Play Brogan if you want to be an indestructible brawler that can create space to keep his allies safe by threatening enemies with powerful blows.

Gold: Onslaught [Attack]
Target a unit adjacent to you. After the attack: Move into the space it occupied, if able.

Adrenaline surges through Brogan's veins as the first drop of blood is spilled, urging him forever onward to battle.

An overall very simple attack that lets you step into the fray and continue your onslaught. In most circumstances, this is merely a way to kill minions and threaten heroes. As you practice with Brogan, plan ahead each round by thinking how you can use your gold to set yourself up for the turn after, such as stepping into position to use your red attack, get closer to a target you want to pursue or use a skill against, or even evade danger by moving away from an incoming attack to guarantee your safety.

Silver: Bulwark [Skill]
You may retrieve a discarded card. This turn: You and friendly units in radius cannot be moved, pushed, swapped, or placed by enemy heroes.

Brogan draws up his shields to cover himself and temper his allies' nerves, forever holding the line.

I suppose it is fitting that the Destroyer is himself indestructible. So long as you have a chance to use your silver after being injured, there will be very few chances for your enemies to kill you. The only way to truly threaten Brogan is to catch him with a double tap that leaves him dead or unable to escape a finisher or to otherwise catch him without his higher defense cards, so be sure to keep either your blue or red close to your chest when facing off against high-damage threats. You can also rely on this heal effect to allow you to safely discard cards when it would net you a benefit, such as trading blows with an enemy hero that will have a harder time staying alive or using your self-discard abilities. Standing your ground is not only a statement that you will not fall, but a method of fortifying your team's position, cancelling enemy attempts to displace you all from your present locations on the battlefield. Use it to ensure an ally can remain where they need to be for that turn.

Red — Primary: Bullrush
Before the attack: Move 2 or 3 spaces in a straight line to a space adjacent to an enemy unit, then target that unit.

Death in battle is the highest honor, and Brogan's berserker rampage will ensure someone finds their way to Valhalla.

Charge into battle with one of the most iconic cards in the entire game. While most melee attacks require you to stand still, Brogan is too hyped up on bloodshed to do so, forcing him to run headfirst into enemies before striking them. The trade-off here is that you have a pseudo ranged attack that does incredible amounts of damage and makes up for your otherwise low mobility, but you cannot attack enemy heroes you began your action adjacent to. Due to your very low initiative, clever enemies will realize their best bet to avoid this red is simply walking towards you, denying a path in which you can move at least 2 spaces to attack. To best avoid such scenarios where your red card is wasted fruitlessly, establish forks where you can charge in multiple directions should one become unavailable. Often, you don't even have to use this red, for the mere threat that you could use it will force many players to play at higher initiatives, letting you save it for later should you wish to.

Red — Alternate: Throwing Axe
Choose one —
>>Target a unit adjacent to you.
>>You may discard a card; if you do, target a unit in range.

Brogan lodges his war axe into an enemy and draws his hatchets as death tries and fails to have him.

The Bloodrage Berserker Brogan Bullrush is a very enticing option that is hard not to take each game, but do not discount his more versatile ranged red. What it lacks in pizazz it makes up for in subtle advantages, recouping some of your lower mobility, giving you some initiative back at tier 2, and allowing you to strike enemies with an effective ranged attack without giving up a lot of defense to do so. You will not have to worry about others blocking your attacks by simply moving in the way, making this a far more consistent attack card for taking enemy minions and punching enemy heroes. The requirement of discarding in order to give it range isn't too bad either as you can usually rely on your silver to get that card back later if you ever find yourself in a sticky situation. At tier 3, you'll even be rewarded for your aggression as you no longer need to discard a card so long as you already have a discarded card from being hit or using another skill beforehand.

Blue — Primary: Mighty Punch
You may move 1 space. Push an enemy unit or a token adjacent to you up to 2 spaces.

When things get rowdy and a brawl breaks out, it won't be long before Brogan starts throwing his weight around like a wild grizzly.

Others often have a hard time ignoring you, and this blue card will help you be the biggest menace you can be as Brogan. Together with your primary red, you can use this to shove enemy heroes acting faster than you into position for your charge on the following turn. But if you think you can outspeed others, this card can also make for great disruption to bother your enemies, stopping their attacks as a sudden punch sends them tumbling away, or an effective set up for your allies, passing them minions or even handing them an enemy hero to devastate with a strong red attack.

Blue — Alternate: Shield Bash
An enemy hero adjacent to you who has played an attack card this turn discards a card, if able.

Violence begets more violence, and even if Brogan doesn't throw the first punch, you can be certain he will throw the last.

This card boils down to a more limited third melee card that will give you some versatility in how you approach combat. The best way to guarantee the discard occurs is to use it when an enemy is standing next to a minion or really wants to hit you. And the best way to think about this card is as an optional counter that lets you save your other attack cards for later. If you do not have to worry too greatly about an enemy's gold attack but are scared of their red, you can usually play this card safely to make the best decision after cards are revealed. Your dream scenario with this card will be to tank a gold attack from an enemy, counter with your own violent shield slam, and follow up with your own gold later when they don't have a chance to escape.

Green — Primary: Bolster
This round: When any friendly minion in radius is defeated you may discard a silver card. If you do, the minion is not removed.

A true guardian protects their people, even sacrificing themselves to ensure their allies' safety.

This card requires far more consideration and thinking than it first appears. Even if you can't take two minions of your own, using this card can allow you to deny a minion take from an enemy and save a wave from being pushed the wrong way. But there is a catch. The enemy hero still gets gold as though they defeated the minion, and you must give up your secure self heal in order to defend these minions.

Only use this card if you can change the winner of the wave and secure more gold than the enemy team in doing so, saving it to allow your team to focus on hero kills without worrying about losing to a double push, or preparing it for the last wave to secure victory. Just remember you need to activate it ahead of time to save minions due to its slow initiative. At tier 3, you can instead choose to discard your gold card to save minions.

Green — Alternate: War Drummer
A friendly hero in range gains 1 coin; if any hero was defeated this round, that friendly hero gains 3 coins instead.

The Destroyer is multitalented; a master skald in addition to being a great warrior, singing the praises of his allies and their victories.

As a supportive brawler, you can help your allies reach their full potential faster, helping your whole team even if you cannot directly benefit from these extra coins yourself. If you have a teammate that benefits more than others from getting to tier 3, or you have an ally that has fallen behind in level, try and prioritize handing out coins to them. It's not favoritism, it's strategy.

The condition for additional coins will encourage your team to seek out kills more, even at the expense of pushing the wave, just don't spend so much effort on kills that you fall behind on gold from taking minions too. Note that this condition also applies if an allied hero is defeated, but don't get it in your head that you should be throwing yourselves to the slaughter to meet that condition.

Playing As Brogan:
Brogan, the Destroyer is an amazing introductory character that can teach you the importance of forking and giving yourself the most options each turn while remaining fairly safe in hero combat. He can also be one of the best zoning tanks and protectors of your team with a higher skill ceiling than one might imagine. If you want to play aggressive, seek to end most rounds either adjacent to an enemy hero and/or forking a minion with your primary red. You can also play more defensively, shoving others away from your allies and threatening enemy heroes when they close in on more vulnerable companions. Seek out moments where it's better to use an attack and when it's better to keep one as a threat as you get better as Brogan.

Pay attention to the small synergies your cards share. A gold or well timed primary blue can potentially put you in position to use your primary red, and your primary green can be a synergistic way to get value for discarding in order to activate your alternate red. Brogan can be built in surprisingly versatile ways, and knowing which cards and items maximize your threat potential in different situations will help you master this stampeding tank.

Playing Against Brogan:
Brogan has some of the highest defenses in the game, and some of the strongest threats available to him. Their greatest strength is their biggest weakness, however. After being injured, most Brogans will try and find a moment to play their silver and heal, and in this moment they have to stand still. Use this moment to position advantageously against him or surround him with an ally to double tap him before he can get entrenched in safety. Brogans that wait until the last turn to heal might find themselves killed by a faster attack when they have no way of moving, although this requires a very high initiative to do so.

Getting in Brogan's way and disabling his ability to threaten you, such as by making him discard first, can help you manage the danger he poses. This is easiest to do against his primary red, which you should always run towards rather than away, setting near him and stopping him from having a path of 2 spaces he can run towards a target. If he is forking you and an ally unit and you can use your movement to block for both of you, do so. A wasted red from Brogan will allow your team a chance to breathe, although a great Brogan will still be dangerous in spite of such an event.`,

  arien: `The lone skirmisher wanders across the waves, seeking a new challenger to test his prowess. Lucky for him, the conflict of Atlanteans and Titans means there is no shortage of new lands upon which he can practice his swashbuckling. Every enemy he crosses lays slain on the ground, and every ally is just another potential enemy should the tides change.

Arien, the Tidemaster is the everyman hero, with skills that span a variety of strategies and allows him to change tactics as the wave pushes one way or the other. An initial observation of his powers has many viewing him as simple, but the ways in which he can use these abilities is anything but. With his honorable gold attack, Arien can choose the way in which he approaches a skirmish, repositioning units to encourage a 1-on-1 duel while giving time for his allies to move out of harm's way. Well aware of the impact potential sound tactics and potent magic can have upon the battlefield, he has prepared a venerable silver to counter them all, acting as the rock upon which rogue waves break. Play Arien if you want a balanced mix of aggressive brawling, tactical crowd control, and exceptional mobility to keep your team flexible from one wave to the next.

Gold: Noble Blade [Attack]
Target a unit adjacent to you. Before the attack: You may move another unit that is adjacent to the target 1 space.

The swordmaster levels his blade at his latest challenger, daring them to seek a way around his impressive tactical defenses.

Victory in hero-vs-hero combat often comes down to the difference of a single number, a single move, a single choice. Arien's gold attack can help tip the scales in this way, giving you the chance to reposition a unit adjacent to your target one space before making the attack. If a minion is helping an enemy hero to block an attack, move that minion away and strike while your opponent is vulnerable. With the right set up, you might be able to move a minion or ally hero to be closer to one another for a minion take that wasn't possible before. Or you could instead pull a tricky play and move a hero into position for a surprise kill from your team. Push back against raging tides by keeping allies away from an enemy's clutches or saving yourself from a double tap by striking one enemy hero and moving the other away before it can land a second follow-up strike. Find positions where you can force enemies to cluster together as they come after you or pass through.

Silver: Spell Break [Skill]
This turn: Enemy heroes in radius cannot perform skill actions, except on gold cards.

Through a combination of anti-magic properties, disruptive sound waves, and sword slashes that create momentary monsoons, Arien uses his legendary blade to cut through magic just as easily as flesh and steel.

Proper use of this skill isn't always easy, but when used at the right moment can be game changing. Just about everyone has a skill on their silver card, so start by analyzing how important each is, then plotting in what scenarios that hero is likely to use it. The threat of this silver alone can make people second guess the actions they were planning for that turn, so merely pretending you are going to play it can be just as useful as actually playing it. Just remember you must stand still to activate this disruptive ability, so be wary of your position and of any aggravated opponents who might turn their ire towards you.

Red — Primary: Raging Stream [Attack]
Target a unit adjacent to you. Before the attack: Up to 1 enemy hero in any of the 3 spaces in a straight line directly behind the target discards a card, or is defeated.

With one powerful slash, the Tidemaster forms a torrent that rips through everything in its path.

Sticking to Arien's primary red makes him a formidable melee brawler, equipped with an attack as strong as Brogan's charge and at an initiative value that can't be easily ignored. In most cases, this attack can be used to force most other heroes to have to play at a higher initiative to avoid it. However, with the right planning, this can be a 2-for-1 special that gets bonus discards out, helping your team apply pressure. In order to achieve that added effect, it will be easiest to use minions who are less likely to move than a hero. Look at each wave and find lines that include the minion you want to attack and positions enemy heroes are likely to stand to take minions themselves.

At tier 3, Arien has one of the easiest repeat attacks in the game. As long as there are 2 targets in melee, you will be encouraged to make an attack nearly every time, putting foes in a tough spot or helping you to achieve easy victories pushing the wave.

Red — Alternate: Rogue Wave [Attack]
Target a unit in range. After the attack: You may push an enemy unit adjacent to you up to 2 spaces.

Calling upon the power inherent in his title, the Tidemaster sends forth violent waves to batter his foes and keep them at arm's length.

Choosing Arien's alternate red grants him a bit more versatility in how he chooses to attack. This is a ranged attack without restriction, making it more reliable for taking minions, and the initiative item it comes with helps ensure enemy heroes have a harder time escaping it. While it can be used to pass minions and enemy heroes to allies after an attack, this can be difficult to set up and execute effectively. Rather, its greatest strength is in how well it helps you to bully enemy heroes in combat while remaining safe. The push that occurs afterwards can save you and ally units from powerful brawlers' attempts to counterattack with their own red, and even save you from ranged attacks as long as you move next to that hero beforehand and can push them out of range. Relying on your waves to swamp enemies and keep them from interrupting you might just give you the edge as you focus on cleaning up minion waves.

Blue — Primary: Expert Duelist [Defense]
Ignore all minion defense modifiers. This turn: You are immune to attack actions of all enemy heroes, except this attacker.

Mere minions mean nothing to Arien. Only those with an honored title are worth his consideration, and he will enhance his own story by ending theirs.

Journeying into the midst of the wave, such as next to enemy twins or the middle of your beach, can be exceptionally dangerous for most heroes. But this incredible defense tool keeps you safe even when surrounded by enemy fodder, letting you shirk off such worries. Just remember Arien's pride demands he ignores the aid of ally minions as well. After upgrading into this path, you'll likewise be fairly safe when surrounded by enemy heroes, being able to safely ignore double taps by discarding this card first before getting away.

At tier 3, you become a true duelist, applying immunity for the entire round. With near reckless abandon, you can pursue a single target and keep pressure on them without worrying about others interfering by teaming up against you. Or, you can take a blow from one hero before moving your attention to a different target who can no longer threaten you in return. Note that skills can still cause you to discard or become defeated, but attacks and their additional abilities will have no effect on you.

Blue — Alternate: Slippery Ground [Movement]
This turn: Enemy heroes adjacent to you cannot fast travel, or move more than 1 space with a movement action.

That is no mirage beneath Arien's feet. That is the might of the ocean, coming to the aid of its champion.

Unless your opponents have specialty movement skills, they are going to have a rough time as you make them sink into the localized lake you form around yourself. This is a crippling crowd control move that can make enemies slip and stumble trying to get to their destination. With fast enough initiative, you can stop heroes from getting away using their own blue card, allowing an ally hero to casually walk up to them using their green and finishing them off. On the flip side, you can catch enemy heroes using their red or blue card to move in on their target, be they minion or ally hero, turning their highest movement cards into their lowest. Just be certain that slow red attack won't be an issue when it's inevitably turned against you.

Green — Primary: Magical Current [Skill]
Place yourself into a space in range without a spawn point and not adjacent to an empty spawn point.

Arien concentrates for a moment as a geyser of water forms around him, refusing gravity to carry him to higher ground.

Mobility tools are never a bad thing, although at tiers 1 and 2 you may find it a challenge to get the desired position from this card outside of the wave or closer to the end of a wave. Regardless, it is a fantastic way to relocate greater distances at a low initiative, something any assassin or any hero in general would covet. By tier 3, these restrictions have mostly disappeared, making it a lynchpin for hunting down weakened heroes and evading danger yourself.

Green — Alternate: Arcane Whirlpool [Skill]
Swap with an enemy minion in range.

A whirling torrent forms between Arien and an enemy minion, swapping your positions.

While this might seem like another mobility trick, it has more utility than just that. Compared with the primary green, it allows you to travel a greater distance but it requires an enemy minion to do so. This can help you quickly jump into the middle of enemy territory, but requires you to seek other minions to take, so swapping with twin minions will give you the most immediate chance to start slashing the ranks. Along with positioning yourself to begin facing off against your foes, you also displace an enemy minion closer to your side. The most valuable use of this green card is to pass a minion to your less mobile allies while you dive into enemy lines to wash away anyone that remains.

Playing As Arien:
Arien, the Tidemaster's strengths may not be apparent during your first game with him, but his simplicity belies incredible versatility. Use your green mobility to position advantageously to push the wave and enable your attack cards' text. Alternate red has a lot of utility but requires much more careful consideration to stay alive, so sticking to primary red is recommended in your first game. Look for lines you can set up with this red any chance you can, as taking minions and wounding enemy heroes in one action is incredibly powerful. So long as you hold your primary blue in hand, you can leap into the center of enemy minions where your gold and silver have the most impact. Together with your alternate green, you become an excellent pusher that can dive enemy lines and secure minions for your team more easily.

If you prefer to be an assassin looking to secure kills against vulnerable heroes, instead think about the value of your alternate blue for locking down enemy movements and your primary green for chasing down foes for the turn 4 finisher. As most heals are on skill cards, you can also keep a note of when such heroes are likely to use them to heal an enemy your team already injured and foil those attempts with a well timed silver. In general, your silver will not be the optimal play during most rounds, but when it is needed, it can devastate your opponents' plans.

Playing Against Arien:
Arien has such a versatile and effective kit that many that play him can find themselves full of overconfidence. Use that to your advantage as you weigh them, measure them, and find them wanting. They will be quite hardy with either of their primary blue or primary red in hand, but if you can get rid of these cards while they overextend between your minions, you may find them suddenly and extraordinarily vulnerable to most attacks. Specifically, if it is the primary blue you are worried about, avoid trying to kill them via double taps on the same turn. Furthermore, if they upgrade deeper into their primary blue and especially once it hits tier 3, think about designating one or two high attack/initiative allies to harry them so that they cannot waltz up to other heroes using their invulnerability.

If you are not the one to engage Arien in a duel, generally it's good to avoid him unless you have skills that can threaten him. Their primary green allows for exceptional mobility but has important restrictions. Use that to your advantage if you ever need to get away from them. And if you are someone that heavily relies on skills outside of your gold card, be very cautious of how and when you use them. Try to be unpredictable or stay outside of his radius to avoid him playing his silver and countering your well thought out maneuver.`,

  garrus: `When you've lived your entire life within the arena, you learn only two things are true. Blood, and Glory. Even now, free from the shackles that demanded his service, his instincts drive him towards combat. His shield will forever weather strikes from his challenger, and his nose will forever hunt them down once first blood is drawn.

Garrus, the Gladiator is a brawler with an insatiable bloodlust that pushes him to seek kills wherever the opportunity arises. Depending on your choice of red attack, he can either be an incredible area denial expert or a menacing hunter seeking to finish off injured foes. His gold reflects his thrill in combat as the more injured he is, the stronger his counterattack becomes. Other heroes will be frightened by his howling silver, which simultaneously allows him to injure himself and shakes the legs of those that hear his battlecry, limiting their movement. Play Garrus if you want to be a frighteningly deadly, king-of-the-hill style brawler that limits enemy heroes' ability to get away once they've encroached on his territory.

Gold: Angry Strike [Attack]
Target a unit adjacent to you; +1 Attack for every card in your discard.

Garrus is not deterred by wounds the way other heroes are. No, the bloodier the battle, the greater the victory. This attack starts as a fairly simple melee attack for a brawler, but what it lacks in complexity it makes up for in potential. Using your silver effectively turns it into a 5 damage gold all on its own and, should an enemy hero injure you as well, it might become a 6 damage gold before items. That said, this gold is highly effective as a counterattack that can make enemy heroes second guess their decision to injure you. Without initiative items, you'll be far more likely to land your attack second in a trade with enemy heroes' golds, giving you a chance to strike with additional damage that might tip the scales in your favor.

Silver: Chilling Howl [Skill]
You may discard one of your resolved cards. This round: Enemy heroes in radius cannot fast travel, or move more than 2 spaces with a movement action.

Those that hear the mad dog's howl are left quaking in their boots, for they know its call signals that the hunt has begun. One of the more popular silver cards in the game, Garrus' howl is very effective at crowd control, especially if you have advantageous positioning. It empowers his gold and turns on his primary red without relying on being wounded by enemy heroes. Even if you aren't focused on Garrus' strategy of building up his discard, this is likely a card you will at least consider playing every round. Note that this silver only works on movement provided by the boots symbol of cards, and nothing else. With a heal, Garrus can allow you to use a card twice in a single turn, something few other heroes are capable of factoring into their game plan. This can let you use your red or gold twice, or give you the safety to play your higher defense cards early and then block with them later, although you'll preferably have an ally heal you in this way as relying on your primary green is action-inefficient and risky. And remember that people will fear you like a dog off of its leash, so use this silver to really drive that fear into them. Find chances to use Garrus' silver that can trap enemies approaching your position, catch enemies from running away from your team's finishers, stall enemies from moving to the next wave, or stop them from taking an additional minion they might have gotten with enough movement.

Red — Primary: Chase [Attack]
Choose one —
>>Before the attack: If you have one or more cards in your discard, move up to 2 spaces. Target a hero adjacent to you.
>>Target a unit adjacent to you.

Once the first drop of blood hits the dirt, Garrus' senses are overwhelmed as his bloodlust takes over. Those that do not run away best be prepared to stand and fight as this pseudo-ranged red allows the mad dog to step 1, 2, and eventually 3 spaces before striking his prey. This movement can only occur after he has been wounded, requiring him to put a card in his discard with silver or be attacked beforehand and survive. As a result, striking with this attack will often occur in the later turns unless you can goad someone into hitting you earlier. First and foremost, this red is made for those that want to play Garrus like a hunter seeking to finish up kills. Without attack items, the damage isn't incredible, making it better against low defense heroes and turn 4 kills on injured heroes. You can attempt to apply such an injury yourself, although it may be easier to secure the kill if one of your allies makes an enemy discard so that you can focus on positioning to hunt them down. Without defense items, you'll have to be cautious about that positioning, as you may need your blue and green for mobility and will therefore be susceptible to attacks before you can use your red. Without initiative items, it will be harder to catch faster heroes off guard, but you can instead use this card as a counterattack in combat to change targets mid-fight after being hit by a faster attack.

Red — Alternate: Blunt Force [Attack]
Target a unit adjacent to you. After the attack: You may move 1 space to a space adjacent to an enemy hero; if you do, push that hero 3 spaces ignoring obstacles.

Gladiators know how to create a spectacle, and Garrus is certain to make a scene when he launches foes across the battlefield with his mighty tower shield. With extraordinary defense and attack all bundled into one, this is most assuredly the red to take if you want to go toe to toe with other tanky brawlers and come out on top. Since it comes with a defense item rather than initiative, you'll be encouraged to focus more on crowd control and area denial. Most heroes will be deterred from standing next to you when they suspect you may drop this attack on the board. Use this to your advantage to zone heroes and surprise them with a mighty blow when they least expect it. The additional function of this card allows you to strike and reposition enemies simultaneously by taking a step and winding up your shield arm. Position yourself between an enemy hero and your ally units to launch that enemy far away from their targets. If you really want to ensure you can use the push effect, plan your attack against minions who are less likely to run away from you, such as in the center of the wave where lots of heroes and minions are packed together. If your attack happens to be faster than other heroes with scary high red damage values, you can more securely play this attack into them before launching them away from you and preventing a counterattack.

Blue — Primary: Threaten [Skill]
Move an enemy unit in range 1 space to a space farther away from you. May repeat once.

The sound of the mad dog's bark instinctively causes his enemies to recoil away from him. Even when surrounded, Garrus holds his ground and forces his enemies into retreat. This blue is his displacement tool. Because it allows you to act at a faster initiative, it can be a safety net for your allies, allowing them to perform the actions they planned for their turn without worrying about threatening attacks and card effects enemy heroes pose at lower initiatives. Or it can just as easily push an enemy hero into the reach of one of your allies' attacks. Angrily barking can save you from attacks as well, but because you could always just move away, only use it to scare off pursuers if you're in a position you want to maintain. Note that the range of this effect is quite low, so try and keep yourself closer to the action when possible so that enemies hear your snarl loud and clear. Minions are equally terrified of you, if not more so, but scaring them off in this manner is a bit more of a niche use, so only do so if it really matters and you have nothing better to do but bark at the moon.

Blue — Alternate: Form Up! [Skill]
Move a friendly unit in range 1 space to a space closer to you. May repeat once.

Garrus' gladiatorial days did not solely sponsor one-on-one combat. Many of his skirmishes in the colosseum had him reenacting military campaigns for the crowd, and he has brought these tactics with him, outside of the arena. This blue is his defensive reposition tool. Form a turtle wall with your minions by pulling them close to boost your defenses and lower your enemies', or call upon your allies to form up for a surprise attack on one of your pursuers. This path is difficult to get value out of, as it encourages you to be further from danger and, because of the wording of the card, you cannot pull allies closer to you if there is an obstacle between you and them. Regardless, drawing your allies out of danger can give them another safety net to play the cards they want to, and if your team's dedicated pushers are ever caught out of position after a wave pushes, you can use this card to sling shot them to the next wave.

Green — Primary: Make a Stand [Skill]
If there are at least two enemy heroes in radius, you may retrieve a discarded card.

Nothing scares the mad dog. Garrus can take hit after hit and come out with nothing more than a scar and a bloody smile. His battle-ready persona allows him to control just how wounded he ends up when anticipating an attack. Play during a turn when you believe you will take 1 or more attacks to allow yourself to choose how many cards remain in your discard at the end of the turn. In some instances, Garrus may be perfectly ok keeping cards in his discard to empower the rest of his kit so long as he thinks it will help him come out ahead in that round. Whenever multiple heroes are surrounding a hero, they usually have to be worried about sustaining multiple discards or being outmaneuvered if one hero decides to wait till later, but Garrus can just play his green and make the decision of how he will respond after the cards have been revealed. At tier 3, he can negate two whole attacks and counterattack safely.

Green — Alternate: Light Pilum [Skill]
An enemy hero in range discards a card, if able. You may move 1 space.

Sometimes Garrus is more predator than gladiator, endlessly pursuing his opponent and never stopping, not even steadying himself to strike. Simultaneously, his steps disturb the dirt while his hands release his wounding pilum. This is yet another way in which he can threaten those that approach him, as it will both wound them and step him closer with the same action. In a melee with other brawlers, Garrus can play this card as a fake out to hold onto his other attacks while still doing damage, then move towards or away from the danger based on his assessment of the battlefield. Played on turn 1, this card can apply an injury to his target, step closer to them, then discard this card with his silver to slow down enemies and still have red, blue, and gold remaining for pursuit. Otherwise, this is another zoning tool you can play when you have a position your enemies want to go towards.

Playing As Garrus:
Garrus is a king-of-the-hill type of hero, expertly controlling enemy heroes within the area around him through fear and clever tactics. However, the way in which you rule the arena is heavily determined by your choice of red. Primary red makes Garrus more of a hunter that actively hunts down kills, but leaves him with slightly lower defense in return. Avoid going double initiative with your first two tier 2 item choices, as it will leave you with too little attack to threaten other heroes and too little defense to avoid counterattacks while you hunt down your mark. Try to land an early injury against your target (either by yourself or with an ally's assistance), then stick as close to them as you can so that they will have a harder time running out of range of your hunt on turn 4 (especially with your silver active). Against frailer targets, it's possible that you can play this red earlier in a round, so long as you have a discard, to pull a surprise attack. Alternate red, on the other hand, turns Garrus into a high impact brawler that can threaten one-shot kills. He will have high enough defenses to block most attacks with his blue and equally powerful damage to crack even the tankiest brawlers. With lower initiative and higher attack and/or defense stats, Garrus becomes incredible at reacting to his opponents' moves. Your role with this attack card is to challenge other brawlers and keep them off guard and away from your allies.

Whatever your strategy is, it's important for Garrus to take up a central position and keep it. This ensures that enemies will have to come to him, allowing him to activate his howl when he wants to spring a trap on those approaching. Additionally, holding an advantageous position over your enemies will allow you to use your skills more efficiently, knowing you will have targets within your ranges and radii. Plan ahead so that when the wave pushes, you end up between the next wave and enemy heroes. This will give your team an incredible advantage with a chance to coordinate and corner the enemy if they approach, or security knowing you can stall for time while your allies farm. Always consider ways you can interfere with and threaten enemy heroes each round, as it is your greatest strength. Garrus naturally leans towards kill victories, so look for opportunities to take advantage of a vulnerability in your opponents' play patterns. If the enemy team is deftly avoiding death each round, think about pivoting to focus on stall, slowing down their attempts to take minions and giving your team the edge in a push victory.

Playing Against Garrus:
Garrus can be one of the most terrifying brawlers to go up against as he not only has frightening combat capabilities, but a slew of disruptive skills that will make you second guess getting in the middle of the action. Try and best him at his own game by displacing him away from the center of attention, as his abilities are strongest when he can force others into his zone of influence. Whatever you do, do NOT injure the Gladiator early, especially not with low damage or simple discard effects, and especially if you don't have a plan to follow through against him before he can take advantage of being injured. Your best chance to kill the mad dog is with powerful attacks later in the round, such as a quick double tap on turn 4. Most heroes will die to a double tap, but his low starting initiative gold and ability to weather staggered attacks mean this is one of the few ways you can kill him at all.

Garrus is frequently and just barely ahead of his opponents in combat. Since trading attacks with him is less effective, a focus on healing may give your side a better advantage, as it will keep your brawlers alive and reduce his potential to kill with his primary red on turn 4. Additionally, his primary red can be fear inducing, but it forces him into a pretty predictable pattern. He will often open by playing blue or green, use his silver to discard the card he played turn 1, play blue or green to then reposition, and finish with red to hunt down a vulnerable target. Interrupt this play pattern by blocking his movements with disrupts and tokens, punishing him with a strong attack after he has played his blue card, or keeping his target away from danger. Brawlers will want to pay particular attention to which attack he is using, as they can apply a lot of pressure to him with his lower defenses on his primary red, but in turn can be outboxed in melee if he is using his dangerous alternate red. Avoiding Garrus when he is using his alt red is generally good advice as he will be double melee and it will be hard to escape him once he's standing next to you. In general, make sure you have a plan for when his howl is activated. This will usually be on turn 2 but a smart Garrus will try to be less predictable with it. You won't be able to move far the traditional way, but smart move choices and alternate mobility options can help you ignore the pressure his silver provides.`,

  whisper: `Judgement must be enacted equally upon all members of a functioning society. And who would be better equipped to condemn the living than a member of the dead. Even in exile, the vampiric adjudicator continues to seek out the damned and ensure they do not escape their final fate.

Whisper, the Outcast is an overbearing presence upon the battlefield that despises the arrogance of the living and revels in the punishment of the damned. He himself teeters on the verge of death, with his item choices and play pattern heavily influencing how close he ends up getting to such a fate. The living have shunned Whisper, so now he takes revenge with his gold attack that can strike fear into enemies who have not yet been injured, even from a great distance from them. His vampiric talents reveal themselves in his silver, which allows him to shrug off wounds and other dangers by feasting on the injuries of enemies. Play Whisper if you want a high-threat assassin who forces enemies to choose between saving their minions and saving themselves.

Gold: Swift Justice [Attack]
Choose one —
>>Target a hero in range with an empty discard. After the attack: If able, that hero performs a movement action on the card they defended with, moving full distance in a straight line.
>>Target a unit adjacent to you.

There is no escaping the Grand Judicator's punishment. Blood must be spilled to fill his scales before penance can be accepted. Whisper is one of the only heroes with a sniper attack on their gold, but there is a limitation to it as with most far-ranged strikes. That limitation is threefold. First, that enemy must be at full health for his blade to connect, meaning it will be harder to use it as a finishing blow in this way. Second, the enemy gets a chance to run away in fear, whether they want to or not. And third, it is a fairly weak attack without additional bonuses. However, Whisper can take advantage of this incredible gold in one of three ways. If used at the beginning of the round, this attack can very easily secure an injury on an enemy hero that gives your allies a chance to threaten a kill. If used later in the round, enemy heroes will have less options to block and so you will have a better idea of what they might block with and which way they might run as a result, possibly displacing them at a crucial moment. With a high attack build, it may even be possible to attack an enemy hero with low enough defenses on turns 3 or 4 and guarantee a kill outright despite them having no prior injuries. Lastly, the Outcast can simply take advantage of this attack's high initiative to finish off injured enemy heroes in melee range.

There are a few things to keep in mind regarding this attack. When using Whisper's gold as a long-ranged attack or to force movement, be very aware of which cards the enemy hero you target can block with and what the movement values (including possible boot bonuses such as from an item) on those cards are. It is very possible to strike an enemy hero who intends to block with a card that lets them move into a better position to use a decisive skill or attack. As an example, they might play a powerful red card and block your gold with their green card to move a short distance and wallop you or an ally, or they might block with their silver card so they don't have to move at all. Additionally, the enemy only has to move if they can move the full distance, so it's very possible if they are surrounded or block with a high movement card that they end up with no valid paths and therefore do not move at all.

Silver: Death Seeker [Skill]
If an enemy hero in radius has a card in the discard, choose one —
>>This turn: You are immune to enemy actions.
>>You may retrieve a discarded card.

The dead draw life from the misery of the living, shrugging off wounds and resisting the advances of their foes as they siphon the blood of the dying. When all else fails, this silver is the card that Whisper will rely on to stay alive. Since their defenses are not fantastic and their red may be needed for movement, this silver will be necessary for survival and indirectly encourage you and your allies to be more aggressive to ensure discards are available for you. Even if you cannot secure a kill yourself, you may be able to force a discard and then use yourself as bait for your prey, stalling for time by using this silver for immunity while an ally comes in to finish them off. If you aren't threatened but had to discard in a trade earlier in the round, you can always discard a card you intend to use later and then take a turn to return it to your hand so that it's ready.

Because of the way this card works and how telegraphed its use might appear to your enemies, playing Whisper may end up involving a lot of risky 50/50s. This is because, if both you and an enemy know their attack will be guaranteed to kill you, and the potential card in your discard can't block such an attack either, that enemy might wait out your silver by playing a different card and anticipating that you will be stuck in place for a turn. Therefore, if you time your cards right, you might be able to play a different card to escape and save your silver for later.

Red — Primary: Sanguine Path [Attack]
Before the Attack: You may move up to 1 space for every empty minion spawn point in radius in the battle zone, up to a maximum of 2 spaces. Target a unit adjacent to you.

Now the Outcast from society, he prowls the streets from the shadows, spilling the blood of those that would hide his suspect from him. While not the strongest attack, this crimson red path provides a pseudo-ranged attack that gets better as minions are slain around Whisper. It makes for a better finisher between the two attacks as it is high in initiative, low in damage, and can strike injured enemies up to 2, 3, and eventually 4 spaces away from you. The trade offs are that you will have very weak defenses compared to other Skirmishers/Brawlers and only gains its primary advantage when you have empty spawn points both in close proximity and in the current battle zone. The longer your team can stall a wave push, the more opportunities you'll have to use this attack to its fullest. As a result, it will be very effective when used on your beach and after the wave pushes back to the center from the enemy beach; these are times where you and your enemies are more likely to be surrounded by dead minions. If you wish to retain your high initiative gold for later use, you can strike early by using this attack instead on turns 1 and 2 of any given round. Additionally, this attack can be a surprise to the unsuspecting, and likewise using this attack when you expect a minion spawn point to be opened up earlier that same turn can be quite the surprise to those unprepared.

Red — Alternate: Blood Fury [Attack]
Target a unit adjacent to you. After the attack: If an enemy hero in radius has a card in the discard, may repeat once on a different target.

Blinded by the corrupt nobles that disregarded the judgements Whisper passed, he now finds himself in fugue states now and again, enacting that same blind and merciless violence on those that have escaped judgement before. Where the primary red path firmly sets Whisper into the role of Assassin, this attack path allows him to tango more securely with other Skirmishers and Brawlers at the expense of some area denial. This is also one of the few multi-attacks that are available at tier 2. While many high damage melee reds are effective when used as forks with a minion and a hero, this one goes above and beyond. The floor is similar in that if an enemy hero dodges the attack, you can still take a minion. But, should said enemy not dodge this high initiative, high damage attack in time, you will have the chance to not only make them discard their valuable high defense card but also take that same minion as the After Attack stipulation for the repeat will then be met (if they don't die outright, of course). Even without an enemy to fork, this attack can still create a bloody mess in the form of two fresh corpses upon the battlefield. Since this card allows Whisper to take two minions that are both adjacent to him, he can use his gold to injure an enemy for his allies to threaten while simultaneously taking two minions in that same round. Choose this attack path if you wish to be closer to the action and support your allies' attempts to threaten kills while still keeping up with the wave.

Blue — Primary: Sprouts of Panic [Skill]
Target an enemy unit in radius occupying a spawn point. Move that unit up to 2 spaces.

Fear of death is only natural to the living, but it is something Whisper no longer needs to grapple with. Instead, he is granted the power to use his unlife to send enemies fleeing right into his clutches. While this skill is one of Whisper's only control-type abilities outside of his gold, it is actually quite difficult to use it for that purpose as it requires enemy heroes to end up on spawn points somewhat intentionally. This is not to say you can't use it as a displacement tool in hero combat to move enemies away from the battle or closer to your allies, but you will need to be quite opportunistic about it. Rather, this card is better chosen as a sort of set up card for your and your allies' attempts to take minions and push the wave. Allies that are not close enough to the battle will appreciate you sending minions running in their direction. Whisper himself will value this set up piece differently depending on his red choice. For his primary red, displacing a unit from its spawn point provides additional steps for his attack to take advantage of so that he can threaten a wider area. For the alternate red, this card can provide additional opportunities for a double take without relying on already paired up minion spawns.

Blue — Alternate: Lesser Evil [Skill]
An enemy hero in range chooses one —
>>That hero discards a card, if able.
>>You may defeat a minion adjacent to you.

As the once Grand Judicator, Whisper will not allow anyone to escape judgement. But that is not to say that he cannot be merciful in allowing the condemned to choose their own punishment. When given the chance to take the weight of their crimes onto their own shoulders or place their penance upon their subordinates' shoulders, the arrogant will often choose what they believe to be the lesser of two evils. Whisper smiles either way, as he knows to only grant such mercy in times when neither choice will lead to a good outcome for enemy heroes. This is a wave advantage multiplier in many cases, and so is best used when you are either already ahead in the wave, or would gain an advantage as a result of an enemy hero choosing to sacrifice a minion. Used this way, you can turn a wave advantage into kill pressure. If your team can get a discard off first, either through your gold or another ally's ability, this deadly choice becomes even more difficult and can allow you to turn kill pressure into more wave pressure depending on how worried the enemy team is about the push. On your opponent's beach, it's very easy for the enemy team to put themselves in a corner worrying about a throne push. In any case, do not use this ability when you have no clear goal in mind or advantage to lean on, especially if your team is at a disadvantage.

Green — Primary: Shadow Walk [Skill]
Place yourself into an empty minion spawn point in range in the battle zone.

Even exiled from his position, the Outcast tallies the crimes of the living. From the corpses of the slain, he rises like a specter to haunt their slayer. Both of Whisper's greens allow him to appear suddenly from far away. This green in particular focuses on mobility in the current wave, allowing him to take advantage of heroes' primary goal of taking minions. Played at a moment when you anticipate an ally or enemy hero will take a minion off of a spawn point in range will allow you to arrive next to them unexpectedly. If you are out of position from chasing down a kill, you can coordinate with your allies to take a minion in range or stall the wave so that you can get back into the action. When you are uncertain of if you should stay on your current side of the battle zone or swap sides to provide additional threat, you can play this card to choose what you will do reactively based on whatever else happens that turn. Just remember you have to enter a spawn point so you won't be able to control exactly how close you can end up from your target.

Green — Alternate: Cruel Twist [Skill]
Swap with a unit adjacent to you, or with an enemy hero in range with a card in the discard. Move up to 2 spaces.

Just as the condemned believes themself to have escaped, they are dragged back into the shadows where Whisper's jury awaits to pass the final verdict. Together with his gold, this green can create a very large area control zone that injured heroes will be forced to stay away from if they don't have another way to survive being swapped with Whisper. Because this swap occurs at such a low initiative, your allies that intend to chase the injured quarry but are going too high in initiative to do so can instead walk next to you knowing that is where the enemy hero will end up. Even if your team cannot capitalize on this devious maneuver, it can still be an effective way for you to simultaneously displace an enemy hero and provide yourself needed mobility to get where you need. Furthermore, since you can swap with an adjacent unit, this mobility option can provide just a modicum of extra movement or even save you from being encircled by enemies.

Playing As Whisper:
Much of Whisper's kit focuses him on injuring and killing enemy heroes, landing him firmly in the role of Assassin. However, with the lack of defenses and low mobility Whisper has, it is important not to get caught up thinking you have to always be the finisher each round. Often, Whisper can be an incredible initiator or a very effective finisher, but rarely can he do both in one round. With his gold and especially with his primary red, he is a fantastic kill support hero, using his weak but fast attacks to get easy discards early that his allies can capitalize on with the right coordination. On the other side of things, his incredible initiative on both his red and gold makes him highly effective at finishing off enemies, either all at once with a surprisingly high damage attack for its initiative or on turn 4 after an ally has already injured an enemy hero. With so many threatening abilities and a guaranteed way to create discards, the Outcast is very well suited to exerting pressure in an area and forcing enemies to accept one of two terrible sentences. Your overwhelming presence has enemies either giving up wave pressure to survive or throwing themselves into death's clutches in order to win a push, making such a decision almost every round. But on rounds where this does not occur, it is because Whisper must take time to feed on the minions and grow his power. Farming is very important to Whisper as his low movement and combat focus can make him fall behind in taking minions as consistently, and all his tier 2 upgrades with the exception of his alternate red do not change in base stats, only in effect. So it is important to spend some time keeping up in level.

Think about the playstyle you want to lead with each round, as it is important to consider which rounds you'll gold early to set up a play with your allies, and which rounds you save your gold till turn 4 to keep enemy heroes on their toes. Building high damage on Whisper is almost always effective as it makes this swift judgement all that more terrifying, and low defense heroes will have to be particularly aware of this threat. Whisper in fact relies heavily upon those that share his love of penance, and is best paired up with heroes that can take advantage of the pressure and easy discards he produces, or initiate for him with their own discard abilities.

Playing Against Whisper:
Going up against the vampiric judge means you'll likely have a discard on your team consistently, and that the squishiest hero amongst you all should be very aware of this threat. Have your most durable skirmishers and brawlers put their own threat down on Whisper to reduce some of this fear. And, if you can't dodge the Outcast's brand of justice, you can always heal it. In fact, double heal teams are very effective in deterring Whisper's deadliness. If nothing else, you can try and use his lack of mobility against him by punishing him with displacement and disruption effects. Keep track of his green to know in what ways he can compensate for his low movement. And note if he has primary red, which makes up for his movement even further at the expense of higher defense. The only other thing to consider when facing Whisper is when he can use his silver to stall and avoid death. Once one of your team is injured, that vampiric drain cannot be ignored.`,

  trinkets: `The world does not respect the genius found within the mind of the kobold, Trinkets. No, they say silly things like "weapons of mass destruction need regulation" and "using your turret's steam discharge on enemy combatants is a war crime". That is why Trinkets left Drakenhuff's academy, entirely of his own volition it should be said! Now the reasonably curious Scavenger roams the sands outside of civilization looking for the next chance to prove his detractors fools, subtracting more than one settlement from the region in the process.

Trinkets, the Scavenger is a mischievous rabble-rouser of a kobold, running around the battlefield to quickly collect scraps and establish a perimeter of defense using his trusty turret. He is quite easily frightened, relying on his devices, his tricks, and his scurrying feet to keep him away from danger. Both of his basic cards are used to build and replace his turret, as it is central to his capabilities. Darting around the field, Trinkets uses his gold card to grab parts off the ground swiftly and construct his turret while doing so. Conversely, his silver card allows him to take his time scrapping old devices in order to build his turret where he stands, patch up his armor, or cause a distraction while he runs away. Play Trinkets if you want to be a true nuisance to your foes, catching them off guard with tricky traps and heavy firepower before making a quick getaway when threatened in return.

Gold: Rapid Redeployment [Skill]
Choose one —
>>Move up to 3 spaces and place the Turret into a space adjacent to you; it counts as an obstacle.
>>Defeat a minion adjacent to you.

A lot of loose goods get dropped in the heat of battle, and none of them go to waste while Trinkets is around. Scurrying from one space to the next, the curious kobold is reliant on his gold card for set-up and survival alike. Up front, it should be mentioned that this gold cannot harm enemy heroes, making Trinkets a rather poor turn 4 finisher in most instances. You will frequently need to use this gold to run into position and build your turret quickly, but it will often be beneficial if you rely on this gold as little as possible to deploy your turret because of its other uses. The second use is simple. This is your way of taking two minions consistently in a round. But the most valuable element of this gold is the fact that it has 4 boots of movement at such a high initiative. You likely aren't able to block most attacks without giving up your red at the very least, but you can at least dodge most attacks before they even find you. Use this gold early when you need to rapidly re-establish your turret in a new location to take advantage of your red, green, and blue card abilities. Otherwise, save your gold for later to take a minion or swiftly get out of dodge when people point their weapons at you.

Silver: Salvage Parts [Skill]
Choose one —
>>Place the Turret into a space adjacent to you; it counts as an obstacle.
>>Remove the Turret; move up to 3 spaces.
>>Remove the Turret; you may retrieve a discarded card.

The Scavenger has earned his title by always having just enough spare parts on hand to put together something nasty. With this card, Trinkets can position his turret more slowly and methodically, at the expense of having a much more limited ability to choose where both he and the turret end up. Find a good position you want to maintain, then play this silver to put your turret down in the spot surrounding you where it will have the most impact, after everyone else's cards have already resolved. This can be a good method of stopping others from attacking you, knowing they might get hit the next turn. Even without the threat of reprisal, placing your turret with silver will allow you to still run away with gold should that be necessary.

So long as your turret is already constructed, this card gains additional uses that further discourage others from targeting you. You can remove the turret for additional movement to get a head start when travelling to a new location to set up in, or otherwise to simply run away from danger when pressed. And lastly, if you're expecting an attack you can block and don't have any good options to dodge it, you can scrap your turret to heal yourself and save your faster cards to run away afterwards. Just make sure you don't remove your turret with silver without your gold available to replace it in the next turn or two, or you'll find yourself twiddling your thumbs for the rest of the round with nothing more to contribute outside of being a frail obstacle.

Red — Primary: Gatling Gun [Attack]
Target a unit in range of both you and the Turret. If the target is in a straight line from you, and in a straight line from the Turret, gain +2 Attack.

"Gears screeching. Barrels rotating. Triangulating target. Turret locking on. FIRE!!!" Together with his trusty turret, Trinkets uses his primary red to maintain a wide area of control. Although it does have a very important restriction of needing the target to be in the overlapping radii of both you and your turret, the far range it provides can encircle a large swath of territory with the right positioning. Thinking like a venn diagram, the closer you are to the turret, the more spaces you threaten. The benefit of this attack path is its flexibility in turret placement overall. As long as there are targets within range of the turret, you won't need to reposition it. However, if you're able to be a tad more clever and set up the turret in places where enemies are likely to be in a straight line from it, most often while trying to take minions in tight spaces, then all you have left to do is position yourself in a straight line of your own to triangulate the attack. This turns it from mild scattershot to focused fire that must be taken seriously. This is not a consistent method of dishing out heavy damage and so shouldn't be relied on for such, but can be paired with efforts from your allies as well as your other damaging abilities to really debilitate the opposition. Don't feel afraid to take crack shots at enemies without the damage bonus so long as you're getting some advantage in that round from doing so and you can still take a minion with your gold to keep up financially.

Red — Alternate: Steam Discharge [Attack]
Target a unit in range adjacent to the Turret. May repeat once on a different enemy unit.

"Turret heat reaching critical levels. Activate the heat sink system and clear the area." Trinkets doesn't exactly have the frame to be a brawler, but he can turn his turret into one in a sort of way. With this upgrade to his turret, the Scavenger can even reuse the heat produced by his turret's operations to strike multiple targets. Using this attack allows Trinkets to stay further away from the action while still having an impact from across the battlefield. There are two primary locations you will want to position your turret when using this card.

First, the turret can be dropped next to enemy twin minions in order to get an easy double-take while opening up your action economy and saving your gold to run away or take a third minion. As with all double take cards in the game, don't focus too heavily on trying to take 3 minions in a round and instead use it to keep your options open based on the situation you are in. When possible, drop your turret next to the twins in the center wave and leave it there for when the wave pushes back into the center to have an incredible wave advantage. Just know that you'll have very little impact without your turret, especially if the wave stalls too long on either beach.

The other place you can position your turret with this upgrade is in chokepoints where you know enemy heroes will want to move through, preferably next to an enemy minion as well. If your foes need to move through a narrow passage to get to a minion they want to take, they will have to pass by this danger zone you have created with your turret. Activate it early when you think enemies will move faster to force them to divert their path, or activate it when they are standing next to your turret to force them to have to play fast or face the consequences. Even if they dodge the attack, you'll have hopefully wasted some of their resources and taken a minion.

Blue — Primary: Disruptor Pulse [Skill]
This turn: Before any enemy hero in radius of the turret performs a primary action, that hero discards a card, if able; if they discard a card, deactivate this effect.

"Sensor grid is online. Hostile anomaly scanned. Administering controlled shock." This first disruption skill is simple, decent even, but very much avoidable. And despite being very easy to avoid, it is easily one of the most groan-inducing abilities your opponents will face because it puts all the onus on them to make the right call. The best time to play this card is when you know for almost certain that an enemy in radius will want to use their primary action, and the more enemies that are in radius the more likely one of them will trigger your trap. Easily the most likely actions that will get caught by this trap are slower attacks (often with a minion available to target), mobility-based actions (doubly effective against primary movement actions), and necessary set up actions (such as Mortimer and Widget's silvers). Hilariously, primary defense actions, which can often be some of the strongest defenses in the game, also count as primary actions for the purpose of triggering this blue, leading to a double discard when used. Remember, this card won't stop these actions most of the time, just cause a little harm to those that perform them. Ensure that your allies are around to apply some pressure to the enemy that discarded for it to have full impact.

Blue — Alternate: Deployable Barrier [Skill]
Place up to 2 barrier tokens in radius, with at least one of them adjacent to the turret; you and friendly heroes gain +1 Defense for each barrier token they are adjacent to.

"Hostile forces have set their sights on you. Deploying defenses to fortify your position." Sometimes the ability to defend an attack and hold your ground comes down to a difference of one or two defense. In those cases, this alternate blue path can be a lifesaver that turns the tide in battle. As Trinkets yourself, your blue card is usually the only other card available to keep you alive if you want to avoid blocking with your highly important red card, so this extra defense won't often allow you to hold your position. Rather, the defensive buff value is better used as a support tool to ensure your beefier brawlers and aggressive skirmishers can go toe-to-toe with equally dangerous enemy heroes, giving your allies the upper hand. If it's vitally important that your ally uses an attack or a skill but just needs a little extra defense to weather an attack in return, this card will make a huge difference. Deploying these barriers early in tight spaces is like having an extra melee minion standing near your allies for an entire round, which can be a great deterrent against aggressive plays.

The defense boost is a very useful part of this card, but it's not always as useful as the simple fact that this card creates tokens, and tokens are obstacles. Being able to block an attack is one thing, but what's even better is not being hit at all. With clever positioning, you can use these barriers to cut off parts of the battlefield from your enemy heroes, possibly giving yourself and allies room to breathe when trying to make a play. This is a great way of limiting the reach of ranged heroes, and can stop melee brawlers outright from having any presence in the zone you have barricaded. Just make sure you aren't cutting off your team from many opportunities when establishing your perimeter. All in all, this blue is a go-to when you want to focus on a strategy of holding down an area and not being forced out of it.

Green — Primary: Updated Design [Skill]
If you are in radius of the Turret, swap with a unit or token in radius of the Turret.

"Initializing advanced particle displacement systems. Please hold onto your bowels." This is a limited mobility effect that can swap allies out of danger or put enemies in it. The exact purpose you use this skill for will be reliant upon your position relative to other units. If you are in the open away from enemy attacks, you can swap an ally in danger, minion or hero, with yourself then use your high initiative to run away with gold or blue afterwards. If an enemy comes and threatens you instead, you can swap with either an enemy minion to deny them the attack or with an ally hero who is far more prepared for a fight. And if your ally needs assistance chasing down an enemy hero or securing a minion, you can always swap yourself with the desired enemy while your ally positions themselves next to you. Ensure that your allies understand these tricky swaps as well since they will need to position properly to take advantage of its utility. At tier 3, this reliance on nearby units will be lessened as you will be able to teleport yourself without issue. Because of its very limited radius, you will want your turret positioned near many units to have the right targets available for the right plays.

Green — Alternate: Self-Destruct [Skill]
Up to two enemy heroes in radius of the Turret discard a card, if able. Remove the Turret.

"Blast shields deployed. Detonation set to 5… 4… 3… KABOOOM!.. Detonation timer requires maintenance." No card is more important to a kill-focused Trinkets gameplan than this one. Being able to catch two different heroes with a green discard will give your team a lot of opportunities to get kills in a round. Using it later will ensure enemies have less options to discard, but leave you turretless and struggling if you don't plan for how you'll redeploy it. Detonating earlier will give your allies more opportunities to seek out kills throughout the round. Once you reach tier 3, this transforms from an effective set up for a kill into a deadly trap that can corner enemy heroes. Use turn 3 to position your turret so its radius encircles the area the injured enemy wants to retreat to, and have an ally corner them from the other angle, then detonate.

Playing As Trinkets:
Be. THE. Problem. That is your primary objective as the Scavenger. You are not very deadly on your own, nor very tanky. But you are full of tricks and surprises, and are exceptional at getting in the heads of the enemy. Always keep them guessing and make them worried to be near your turret. For a majority of your cards, you will want your turret to be positioned near the center of the action but well within the range of enemy minions so that you can keep up with the push. If you are using alternate red, however, then you will be a bit more restricted with your turret placement, wanting it adjacent to at least 1 if not 2 enemy minions. On that note, it is important to understand which of your cards require you to be near your turret and which don't. Alt red still requires you to be within range of the target adjacent to your turret, but the range is so far that you can make some distance before activating it. Meanwhile, your alternate green and primary blue have no such requirements and can be activated from anywhere on the battlefield, meaning you can exert pressure without repositioning your turret if it happens to be in the right space already. This will let you damage enemies while you prepare for the wave push or avoid danger. Conversely, primary red, primary green, and alternate blue all require you to be in the vicinity of your turret to get value out of, so will involve a playstyle that has you much closer to the danger and often holding your gold to get out of dodge if you are threatened. It is up to you to mix and match which cards you want for which scenarios, or whether you want to go all in on one strategy or not.

Don't feel afraid to reposition your turret where it is needed, but try to do so with silver when possible and avoid repositioning too often if you can. Sometimes it's better to leave your turret behind after the wave pushes so that you can gain a bigger advantage when the wave pushes back. Be aware of the difference in how your silver and gold are able to position your turret and provide movement, however. When moving with your silver you must remove the turret first, meaning it needs to already be out but you can eliminate it as an obstacle before choosing where to scurry off to. And again, this is at a much lower initiative, making it a good reactive escape tool that can be used when threatened or held when not. The movement from gold can be very useful even without placing the turret, so don't always feel like you need to reposition it when running away in this manner, as that extra space of movement can be critical in some instances. But, if you are repositioning the turret, note that this happens at the end of the movement so will not clear the turret as an obstacle when choosing where to run. It isn't just an obstacle for you, though, and sometimes simply placing the turret in tight spaces with either silver or gold can heavily limit the movement options of those chasing you. Speaking of running away, you will often be forced to do so by a team that is prepared to deal with your antics, but that doesn't mean you should do so every time you are threatened. It is important to know when to take the gamble and call your enemy's bluff on if they'll attack you or not. Usually, if they still have their red and gold attacks available, it's a safe bet that they'll use at least one of those to threaten you with, but if they only have one attack and no minion to target with it, there will be a higher chance that you can take a moment to use one of your cards and save running away for the next turn. Knowing the difference between when to disrupt your enemies and when to run away and focus on the wave is integral to any good Trinkets game. Analyze your opponents' playstyles and choose which moments are right for which actions.

Playing Against Trinkets:
Trinkets will continue to be a problem until he is dealt with or his turret is temporarily inoperable. So long as he and his turret are around, you will have to spend some amount of your team's resources not necessarily getting a kill on him, but at the very least threatening him enough that he uses up too many of his own resources getting away. If he is forced to discard his red, a lot of his wave pressure will have been diminished, forcing him to either remove his turret to get it back and then take an additional turn to redeploy his turret if he has gold available, or else he will have to continue without his red and rely solely on his gold to take a minion rather than running away, making him much more vulnerable.

Be aware of when he plays his silver as it gives him the best chance to play reactively, especially if his turret is out. If he is struck and survives while his silver is out, he'll be able to negate the attack and run away next turn much of the time. Or, he can wait to see where you position and place his turret in the next spot around him to threaten you with. With his primary red, you need to avoid ending up in a straight line of both him and the turret, meaning being adjacent to him can be dangerous unless you can hit him hard enough to pierce his blue before the lined up attack hits you. Likewise for his alt red, avoid standing where the turret can be positioned next to you, especially if it's next to an ally minion of yours as well. On the topic of his alternate red, it is easily his best tool for focusing on push victories, and is most effective in this way positioned next to your twins. If there is a way for your hero's kit to remove his chances of performing a double take with that red, you will eliminate much of that card's value.`,

  ursafar: `In the frozen north, tribesmen tell tales of the frost beasts that command the respect of their people. But there is one amongst them that all other beasts bow to in fear. The Great Bear, Ursafar, stalks through the tundra of this desolate landscape like a boogeyman, feeding on the fools that do not travel with caution.

Ursafar the Savage is a ferocious beast filled with a fountain of endless rage and bloodlust. While slow at first, each action he takes builds up his rage, empowering him with more opportunities to rip and tear through his victims. The big bad bear sharpens his claws on the bones of his enemies with his gold card, a fast and powerful attack that allows him to lunge at his prey when enraged. His silver keeps the bloodshed coming, enraging him if he is not already and, if he is enraged, allowing him to repeat an attack or movement to stalk his prey. Play Ursafar if you want to be a lumbering, aggressive brawler that builds momentum each round while dominating the area around you.

Silver: Angry Roar [Skill]
If enraged, perform the primary action on one of your active cards with an active effect. This round: You are enraged.

Some claim he is a beast awoken from a bygone age. Others say he is the avatar of the forest's rage. Whatever the case, being enraged is vital to Ursafar's playstyle and it is important that you activate his rage as soon as you can each round. Once enraged, you will have more options at your disposal with which to threaten enemy heroes. While you can use silver to enrage, it is much better to use one of your attacks or, failing that, your blue to get rage started early. Angry Roar has much more versatility baked into it, so only use it to enrage when you have no attack targets and you are in a strong position where enemies have to come to you, allowing you to save blue for defense instead against enemies with higher attack and initiative stats. More likely, you will be saving Ursafar's silver to repeat the actions of your gold, red, and blue cards at a slower initiative. Fast attacks and movement become slow, reactive plays that allow others to act first and give you more information before you take a swipe or stalk your prey.

Gold: Claws That Catch [Attack]
Before the Attack: If enraged, you may move 1 space to a space adjacent to an enemy hero. Target a unit adjacent to you. This round: You are enraged.

Beware the Great Bear! It's jaws that bite, it's claws that catch! Beware the savage beast, for there will be no rematch! Slashing and biting into your victims is the most effective way for Ursafar to become enraged, and striking quickly is the best way to guarantee these attacks land. Use this turn 1 against targets that might run away or get displaced in order to ensure you are enraged for the entire round. As is, this savage attack is an above-the-curve gold that hits hard at a difficult to avoid initiative, giving Ursafar an edge in hero combat. Once enraged, it becomes even more difficult to escape your clutches as enemies can no longer rely on using faster golds to sidestep the attack. This makes for an incredible turn 4 finisher that can keep wounded foes from running away or punch through healthy enemies all at once depending on your build. Note that you need a hero to lunge next to in order to perform this movement, but you can attack a minion instead of that hero if you end up adjacent to one as a result.

Repeating this attack using your silver makes it less of a guaranteed strike and more of an area denial tool. With the ability to lunge active, Ursafar can threaten a zone within 2 spaces around themself. While avoidable, the possibility of this repeat will discourage enemies in range from moving with green. But remember that you can only lunge towards heroes, so it is best you use this repeat only if you have a minion already adjacent to you, if the threat of the attack landing is worth it, or if you have blue active to move instead.

Red — Primary: Prey Abundance [Attack]
Target a unit adjacent to you. After the attack: If enraged, and the target was not removed, remove up to 1 enemy minion in radius. This round: You are enraged.

These woods are filled with beasts aplenty. Yet for each kill they score, the Great Bear scores twenty. When using this attack, you are not forced to choose between attacking heroes and attacking waves as often. Not only does this path grant you higher base damage and defense, but you also gain initiative items with it, making it far better suited to combat. Further encouraging this aggression is its enraged effect, allowing you to swing on tanky heroes and remove enemy minions if they survive. Between this effect and your ability to deal out attacks with 3 of your 5 cards, others will have to bear in mind the danger you pose.

Following up a heavy swing from this red with your gold or a repeat from your silver can be a deadly one-two punch. Saving your repeat, though, can let you keep a frightening threat in hand, as even those prepared to survive your rampage will give up wave pressure in doing so. At a relatively low initiative, this can be a good way to keep enemies from approaching you, especially in choke points they need to pass through.

Red — Alternate: Rip [Attack]
Target a unit adjacent to you. After the attack: If enraged, gain 1 coin. This round: You are enraged.

Rip and Tear, until it is done. Rip and Tear, as your enemies run. You are a growing Ursafar and need your nutrients (see: the blood of your enemies) in order to truly fulfill the title of Great Bear. While there is nothing wrong with burning this attack against enemy heroes, you will want to trigger its enraged effect for the greatest value. A single extra gold might seem small, but it goes a long way towards helping Ursafar keep up and surpass other heroes in level. At tier 3, the coin gain goes from 1 to 2, turning a single minion into a heavy's worth of gold. Additionally, it gains more effectiveness against enemy heroes as a finisher with this card at tier 3, scoring an extra life counter, usually making a kill worth 3 life counters before enemies hit level 7. This is a difficult trigger to land without your allies helping corner foes for you.

Your silver repeat doubles everything this card is capable of. In the best of circumstances, surrounded by enemy minions and with no immediate threat to be aware of, you can enrage on one minion with gold or by moving with blue, then use red and silver to gain 2-4 extra coins based on your tier. This will force enemies to either have to divert their plans to come deal with you or allow you to gain a massive gold lead. Use that kind of pressure to your advantage, but don't be so greedy that you turn yourself into an easy kill.

Blue — Primary: Rampaging Beast [Movement]
If enraged, after movement, you may swap with a unit or a token adjacent to you; if you do, move up to 1 additional space. This round: You are enraged.

No cage can contain the beast. No wall can protect its prey. The Great Bear is here, and he is here to slay. When calm, Ursafar can only lumber slowly towards his target, taking a single, massive step forward. This is enough to anger Ursafar, who hates any obstacle standing between him and his next feast. Once enraged, this blue helps him avoid being blockaded by walls of obstacles as he approaches his target, crashing through them and displacing any unit or token in his path. In token heavy games, this is almost a must have, but even with no tokens on the field this is a very useful blue to have. This will best be used to approach enemy units you intend to strike, but the swap feature means it can also be an effective method of putting a body between an enemy hero and their target, be that yourself or an ally.

At a high initiative, your blue is good for enraging and dodging attacks, but not very effective as a reactive tool when used to disrupt enemy plans or chase your prey. Your silver changes this fact, allowing you to enrage with blue and position within one space of an obstacle in the direction you want to go, then repeat with silver afterwards at a far slower initiative. This makes the swap far better for disrupting enemy plans by waiting for their movement and forcing them to acknowledge how you might mess up their plans. If the enemy you are seeking to mess with has already played their green card, they'll likely have little options for countering your trap.

Blue — Alternate: Cold Ire [Movement]
If enraged, gain +1 Movement. This round: You are enraged.

Like the biting cold the bear comes creeping. Slow at first, then swiftly comes the reaping. As with primary blue, this is a simple threatening step in the right direction when not enraged. Without an attack, it's a good way to activate Ursafar's rage. When used while enraged, it becomes a more effective way to clear long, open spaces without relying on your red, allowing you to save it for an attack instead. In games with fewer obstacles and when you are caught out of position, it can go a long way to getting you back in the battle, but little else.

Repeating it with your silver gives it the added advantage of being far more reliable for hunting down enemies than primary blue, as your prey cannot run out in the open to avoid obstacles. Ironically, this does make obstacles more effective at stopping your approach, but this is mitigated by the extra movement and lunge from your gold attack if you still have it available. Thus, playing blue early to enrage then using silver on turn 3 to hunt down enemies can be an effective playstyle on a team that can achieve consistent discards, but as with the other blue, green cards will still outmaneuver your stalking footsteps.

Green — Primary: Eyes on the Prey [Skill]
If enraged, an enemy in range discards a card, if able.

Through the blizzard. Across the river. Over the hill. Nothing comes between the beast and his kill. That is the one thing Ursafar excels at more than any other. Threatening and securing kills. Both greens give you great reactive options, but this one is more focused on being aggressive with additional discards. In fact, choosing this green gives you 4 out of 5 cards that are capable of causing a discard. Play it after becoming enraged and when you don't want to risk one of your attacks getting avoided. At a range of 3 and with the right positioning, you should have at least one good target, but don't force the discard unless you or an ally can follow up. Know when it's better to chase after them to land a powerful blow and when a well timed discard will cripple their round.

Green — Alternate: Instinctive Reaction [Skill]
If enraged, choose one —
>>Perform the primary action on one of your discarded cards.
>>You may retrieve a discarded card.

By sword, by talon, by flame, by pain. The Great Bear's legend will never be slain. Ursafar is not necessarily unkillable because he is tanky, but because the threat of his attacks in return are an exceptional deterrent. However, a concentrated effort can bring the beast low. That is if you don't account for the adrenaline boost of a bear on the hunt. So long as you're enraged, you can safely anticipate attacks and buy yourself a turn during which enemies will have to either lock you in place by attacking you or give you a chance to retaliate using the card you blocked with. If you are enraged on an attack card, discarding your silver will allow you to repeat one of them. Otherwise, a block with your red card gives you a fantastic retaliatory attack, with a follow up from your gold to seal the deal if it's available. Note that if you use an attack card in your discard in this way, it does become active for the purpose of repeats using your silver.

Playing As Ursafar:
This savage behemoth is THE king of the hill, primarily because they have a hard time getting off the hill they have planted themselves on. Your biggest weakness is your lack of mobility, so it is vitally important that you aren't caught out of position away from the action. Primarily you want to be near enemy minions as they are not likely to escape your attacks, giving you an easier time getting enraged. Enraging using your attacks is often the best thing you can do unless you have a reason to stall and wait for what others do. Try to have an attack target at the beginning of each round to maintain momentum. Otherwise, you will need to rely on blue to enrage or green to get you next to a target that you can slash into.

Because Ursafar's silver can copy an attack, he has the unique advantage of three attack cards available each round, along with an additional way to inflict a wound on his primary green card. There is no greater sign that Ursafar the Savage is meant to be a kill focused hero that applies heavy pressure to enemies. So long as you can connect with one of your two attack cards, you can be a bit more risky with the other card and take swipes at enemy heroes in hopes that an opportunity for a kill arises. With enough defense in hand, it is perfectly reasonable to swing your red card at an adjacent hero in hopes that you take their red out of hand. Since you have more attack cards available to you, trades like this will benefit you ultimately. Conversely, trading kills with an enemy hero by sacrificing your own life is disadvantageous to you as Ursafar relies on continuous pressure to be effective, and taking a round to get back into a good position after a respawn will set you behind greatly. Act as a great danger to your foes, but be considerate of your own life while doing so.

Playing Against Ursafar:
Once the Great Bear gains momentum, it will be very difficult to stop them. The greatest way to counter their aggressive playstyle is to disrupt their ability to land attacks. Use their lack of mobility against them by pushing them, placing them, and slowing their movement further. It will be hard to dodge their gold attack without being equally fast if not faster, but their red and silver repeat are far easier to avoid and disrupt with fast skills and abilities. They will want to be situated next to an enemy unit at the beginning of each round, so the best way to stop them and keep their gold from activating early is to avoid standing next to them at the end of a round, often by timing your green accordingly to step away from them. Keeping them away from any target at the end of a round is even better, as they will be pushed to use their blue to become enraged and thus give up a higher defense card. Killing the beast is a more challenging but more rewarding task, more so than killing most other heroes as the set back it puts upon him is far harder to come back from and far easier to take advantage of. Snipers are also particularly nasty for Ursafar to deal with, having enough range to tag him without being in reach of his lunging claws.`,

  razzle: `Come and meet the main act of this circus performance. First we have Razzle, the amazing acrobatic wonder! Next comes… what's this? Another Razzle ready to wow you with their devious disappearing act! Wait, another Razzle, and another? That's right! Four Razzles all prepared to give you a performance you'll remember for the rest of your life. Which is the original? Are any of them truly there or are they all just illusions? Stay for the show and find out for yourself!

Razzle the Fey is four heroes in one, all ready to pull out tricks and traps in order to discombobulate their enemies and pop their allies into place. But be mindful, as four times the possibilities also means four times the danger. Appearing and disappearing are the name of the game with the Razzle Dazzler. With their gold card they can hit enemies so hard they begin seeing quadruple as more Razzles appear. When the act gets a little too serious, Razzle reveals they haven't been there the whole time by vanishing back into one hero. Play Razzle if you want to bother enemies by poofing in and out before swinging your allies into position for their spotlight.

Gold: Stunt Doubles [Attack]
Target a unit adjacent to you. After the attack: Spawn up to 3 more of you in radius; each of you is the same hero, except when actions are performed. If defeated, remove all of you.

One Razzle, Two Razzle, Red Razzle, Blue Razzle. Up to three other Razzles pop out onto the stage after the first strike finds its target. It is in your best interest to get these clones onto the battlefield to start shuffling them around and messing with your enemies. Before you do so, however, you should be aware of the dangers present during Razzle's performance.

The more performers on the stage at once, the more likely one of them might get an injury. This means that you might have more ways to affect different parts of the battlefield, but also that there are more targets for your enemies to hit and less ways to dodge. Use your stunt doubles to create forks for your cards in different locations, but be well aware of the dangers present near each Razzle and which of you is benefitting from what minion modifiers and other effects. A skill or other ability that affects one of you doesn't necessarily affect the others as each distinct Razzle is considered their own hero.

When your stunt doubles first take the stage, they will all be clustered together without a radius item to help spread out. Clever competition will take advantage of this in one of a few ways. They might threaten one of the spaces you want to spawn a Razzle into. Some heroes have effects that cause multiple discards at once or repeat attacks with the stipulation that they must affect different heroes, which each Razzle counts as, making them quite vulnerable to these abilities. Be aware of which repeat discards are available to enemy heroes and how to avoid them. Lastly, there is the simple fact that enemy heroes can position to threaten multiple Razzles at once, leaving less chances for them to escape. In each of these circumstances, clever positioning on your end and timing your Razzle spawn so that you aren't dropping clones into immediate danger are tantamount, but with four Razzles drawing the enemies' ire, they will inevitably find themselves the center of attention. No worry, for the fey trickster has a few methods of masterfully tumbling through swords, saws, and sorceries leaving you smiling in the face of death.

Silver: Crowd Control [Defense/Skill]
When used as a defense action, +2 Defense for each other you in radius.
When used as a skill action, remove all other you in play.

In a puff of smoke, Razzle's stunt doubles exit stage left, leaving the original(?) Razzle sucking up the spotlight. Cherish Razzle's Crowd Control, as it is key to your survival round to round. While only a base defense of 1 when Razzle is caught all on their lonesome, your clones can help absorb some of the blow to turn it into a 3, 5, or even 7 defense block based on how many of them are nearby. Using your stunt doubles in this way is not the most polite way to treat your costars, however, and so it should not be relied upon to block every attack that comes your way. Rather, this silver is at its best when it is saved to allow you to bother your foes before vanishing back into the safest clone, leaving them swinging at empty air. Sometimes the best thing Razzle can do is be in the way enough to goad enemy heroes into wasting as many attacks as possible trying to kill you (whether by blocking them or dodging them) before you vanish from sight leaving their efforts null and void. Know how strong their attacks are, how fast they swing, and how likely they are to use them at any given time so you can best waste theirs.

Red — Primary: Hit and Gone [Attack]
Target a unit adjacent to you. After the attack: You may remove one or more of you in play, except the last one of you.

The most exhilarating performances have the audience on the edge of their seats wondering if the star will dive headfirst into danger or retreat from the flames. Razzle amazes them with both simultaneously, vanishing as her mark wonders what just hit them and why the crowd is laughing. With primary red, the danger is mitigated by simply removing your most endangered Razzles from the board entirely. At such a high initiative, this can be a great method of dealing damage or taking minions while avoiding retaliation from enemies. At tier 2, the only restriction is that at least one Razzle must remain. Want to smack someone then vanish before they can hit you back? Done! Need to take a minion but also remove a different Razzle from the crosshairs of a dangerous sniper? Congrats, they were never truly there! Have too many Razzles fighting on the beach before the wave is about to push back to the center? Hooray, you can get one last lick in before revealing the lone Razzle waiting to spawn more clones where they are needed!

Consider which Razzle is in what danger and how many may need to remain so you don't lose too much pressure. Sometimes all it takes is one vanishing act while the others stay in close proximity to keep your silver defense up to task, or maybe you just want to remove two in order to spawn them elsewhere while the fourth Razzle holds an important position. This red will aid you if you plan to play more spread out, as it will be much more difficult to threaten all 4 Razzles at once and you will have 2 different options to retreat to your safest clone between this card and your silver. At tier 3, you can remove every single Razzle if you would like, returning to base WITHOUT losing any life counters or giving up any coins. A truly hilarious method of denying enemies a kill when they think they have you cornered.

Red — Alternate: Rummage [Attack]
Target a unit adjacent to you. After the attack: If there's another you in radius, you may retrieve a discarded card.

Building synergy with your costars upon the stage is important, and to the fey there is no greater team building exercise than running a pickpocketing racket. One Razzle distracts by creating a scene for the onlookers while another Razzle collects goodies to share amongst their clones later. Rather than avoid the damage, this attack helps you to simply shrug it off by healing up afterwards. At tier 3, this even allows you to heal multiple cards at once so long as there are as many Razzle clones in radius of the one attacking. This card encourages you to keep your Razzles close by, both to be able to block big attacks with silver and to recover afterwards.

Razzle will want to get in people's faces even more than usual with this red, burning their attacks and then healing up to waste your enemies' time while buying time for your allies. The real trick to ensuring value from this attack is in the timing of it. Play risky by guessing when you will be hit with an attack faster than this red to instantly negate it or at least force your enemy to reconsider where to direct that attack. Or slow play it with either green or blue to position yourself after taking a hit and healing from relative safety on a later turn. Like with your silver, it is important to know how fast enemy heroes can attack and how strong those attacks will be to predict the right move in each scenario. Overall, Razzle's heal red is better against high initiative, low damage heroes and teams with lots of ways of forcing additional discards.

Blue — Primary: Group Performance [Skill]
Swap places with friendly hero in range. Move one other you up to 2 spaces.

With smoke and mirrors and a little fey magic, the trickster obfuscates who it really is behind their many masks. The audience loves a switcheroo, but your enemies will surely hate it when a charging Brogan appears from underneath Razzle's disguise. This is by far the most fun card in Razzle's toolbelt. Many of their other cards can be bothersome but this one allows you to really impact the game by swapping your allies right where they need to be while positioning another Razzle to further assist. Since you will be creating a lot of noise your detractors will have to pay attention to, you will often have an enemy or two coming to shut you up. Imagine their faces when it is not a frail Razzle clone they come toe-to-toe with but a beefy brawler ready to lay down some hurt. Not only will they have to consider what card you might play, but what card any of your allies in range might play as well. When using this swap to look for these sneaky kills, try and keep its initiative value close to that of your allies' best attack to give as little a window as possible for your mark to react.

Other than that, the swap is still a massive boon to get your allies out of danger and into position to use any of their cards, really. So long as you can keep your survival tools handy after the swap, you can swing in and save your ally from danger before vanishing in a puff of smoke. And if you find yourself in a beneficial position for the wave relative to your other stagehands, a quick swap to get them in the action while you position another Razzle will grant your team a tremendous amount of wave pressure.

Blue — Alternate: Magic Trick [Skill]
Push a unit adjacent to you up to 2 spaces; for every space the target moved, move this one of you one space in the opposite direction.

Turn other performers into glorified spring boards with this advanced acrobatic technique! Razzle can toss minions to their allies while darting forth towards a different target, shove an ally ready to swing right into the arms of their sworn enemy, bounce off of an enemy to safety while they fall tumbling backwards, or even leap off of another Razzle to get them both out of danger.

Similar to primary blue, this is incredibly useful for setting up surprise kills for your allies, but requires a bit more thoughtfulness on your part to get the most out of it. Remember that Razzle must leap off of their target to build enough force to push them, and so they must move an equivalent number of spaces away from them if able. Therefore, you need to line up your clones not only to push your target into the right position but also to ensure the clone doing the pushing doesn't end up in a dangerous space themselves.

Green — Primary: High Wire [Movement]
After you move, you may move another one of you up to 2 spaces.

Darting left and right, the tightrope terrors confuse the spotlight, leaving the audience unsure of what their next move might be. With this straightforward mobility card, Razzle can move 2 different clones with no real restriction. This subtly hides the core of their gimmick, which is the ability to threaten multiple lines of play in completely separate locations. One Razzle can move in to aggress the enemy team or aid in a team fight while the other finds a minion to take or dashes to safety for when the retreat button is needed. Or, should you need to ensure a plan of action is successful, both Razzles can cover for one another, moving in tandem to find multiple positions from which to aid their teammates with a well timed blue. In essence, this is your only reactive card and should be used to set yourself up with multiple options or maneuver your clones while keeping them in radius to help your silver block.

Green — Alternate: Theatrics [Skill]
Swap places with a minion in range.

Is it a ranged minion? A heavy? NO WAIT, it's Razzle with the steel chair! While this trick is difficult to pull off consistently, it is rather funny when you successfully take away a minion from an enemy hero only to vanish the next turn when they try to hit you instead. It does not only allow you to swap with friendly minions, and can be a great boon in tight waves when Razzle is able to swap with an enemy minion to put them next to another Razzle or one of their allies. When you are already planning to move reactively with green, keep an eye out when using this card for clever swaps that might be able to occur after everyone else has gone. Unfortunately, at only range two it's quite possible for enemy heroes to simply walk up and be next to you and a minion you can swap with in order to deny your trickery, which is why it is heavily improved by a ranged item and is important to use it when you have clones that are walled off from enemy approaches. Only one Razzle can swap at tier 2, and swapping two Razzles impactfully at tier 3 is difficult, so pay attention to how vulnerable your clones will be staying still after the swap occurs.

Playing As Razzle:
Razzle is a bothersome nuisance of the greatest kind, and is particularly effective at getting in the face of and limiting the actions of slow melee brawlers even if they can't kill such foes easily on their own. Against low defense teams, their attacks can become surprisingly deadly when timed properly while remaining relatively safe depending on the red and silver available. That said, it is very important that you remain entirely unpredictable as Razzle for your own safety. Getting caught playing your cards in a consistent pattern is a death sentence on Razzle more than other heroes. Avoid using your gold or silver too early in a round if you can help it, and don't drop clones carelessly without thinking ahead. Having multiple clones threatened by high attack heroes can be extremely risky and difficult to escape, as using your silver too soon will leave you without a strong defense and dodging attacks is far more troublesome when there are multiple targets your foes can pop like a balloon.

In most cases, it is better to not pick a fight in turn 1 of a given round unless you are lining up with a teammate to use your blue for a kill. As a general rule of thumb, Razzle will be at their most vulnerable early in a round when enemies can threaten them into giving up their silver before chasing them down, and will be at their strongest later in the round when they have multiple avenues to disrupt enemies while having a backup plan for survival. Unless you need all of your clones close by to block with your silver card, move one of your Razzles to safety away from the action and preferably in the direction of the next wave.

Razzle is a performer at their core, and so it is pertinent that you share the spotlight with your team and that they share that spotlight in turn. Stay near your allies to make the most of your supportive skills and capabilities, using your clones to block off your enemies and your blues to get your costars where they need to be. When you find yourself alone with only your clones for company, focus on taking minions and surviving more than anything else. And again, remain elusive whatever your plans may be.

Playing Against Razzle:
Trying to land attacks on Razzle can be like a game of whack-a-mole if you don't know what to expect from them. A good Razzle will remain unpredictable, but there are many ways to force them into lose-lose situations. First and foremost, they are extremely weak without their clones, and are extremely susceptible to ranged attacks in this state. Zone them away from melee targets and you may be able to eliminate Razzle's potential for an entire round. If they do make their way to a target to use their gold on, they will still be very vulnerable. It is possible to guess where they will want to spawn their clones and threaten those spaces knowing their gold will go before most other attacks. Or, after their clones have dropped, you and another ally can try and surround them. If you can cover attacks on every single clone, Razzle won't be able to use silver to avoid the attack. But, even if they are able to use silver to get to safety, you can still use your red to threaten them, then chase them to their lone Razzle if your gold would be enough to breach their other defenses.

General strategy against Razzle is to try and get their silver out of their hand as early into each round as is possible. Threatening them on turn 1 with enough initiative and attack can force them to give up either their silver or gold to block or avoid the attack, leaving them far more vulnerable for the remainder of the round. A Razzle without their silver will have to rely on their red attack effect and high initiative to stay alive, and a Razzle without their gold won't be able to summon more clones around them for security. If Razzle doesn't feel immediately threatened, they will likely try to use their green to reposition, or even their blue if they want the extra movement or want to save their green for later. Once their green is missing, though, it is likely that most other heroes will be able to move after them, allowing you to react to their actions each turn and try to surround them.

Pay attention to their choice of red for their survivability options. If they are on primary red, they will likely try to live by playing a variation of red into gold with silver as a backup plan, or silver into gold with red as their recall strategy if they are in danger early in the round. On alternate red, Razzle might try and brawl a bit more by blocking with their silver then healing it back up to go again. In either scenario, counter them with an attack that is fast enough and strong enough to kill them after they've expended their silver but before their red can land. Their choice of blue is also important to know so that you can avoid the sneaky kills they are capable of. With their primary blue, you will have to be aware of the initiative gap between them and their allies' attacks when standing near them so that you know how fast you need to react in case of a swap. Razzle's alternate blue is capable of something similar, but instead you will want to also pay attention to lines created by her clones should they push you into an enemy hero, or push an enemy hero into you.

As far as matchups go, any hero with multi-discard effects and multi-attacks that can hit multiple Razzles in a cluster will be a decent start for countering their crazy antics. Ranged heroes can be effective at threatening multiple Razzles in general but might struggle when their clones press up against you, while melee brawlers will have a harder time pinning Razzle down but an easier time boxing with their many clones while remaining a bit safer.`,

  rowenna: `Rowenna is a heavily armored brawler, chivalrous enough to heal herself, her allies, and even her enemies! With a unique twist on her gold card, she specializes in surviving attacks and staying in the thick of things when fighting for waves. When it comes to fighting heroes, she is better at beating opponents' defenses with big swings than at eliminating wounded enemies.

Gold: Code of Chivalry
Target a unit adjacent to you. Before the attack: If you target a hero, both you and the target may retrieve a discarded card.

Rowenna's definitive card, her gold changes her playstyle from many other heroes. The sense of honor means that everyone rests before the attack, even her enemies. This prevents her from using this to finish off a wounded enemy, if the card in the discard would be able to defend since they heal beforehand. The significant amount of damage on this card means it's at its best when used to initiate, hopefully drawing a blue or red card from an opponent's hand. It can also be a fairly reliable self-heal, which works especially well if Rowenna's gold goes after an opponent, or she is healing from a previous injury.

Silver: Throw the Gauntlet
Place yourself into a space in range adjacent to an enemy hero in range; that hero may move 1 space; if they do, gain 2 coins.

This card gives Rowenna powerful slow movement, making up for her lower mobility and allowing her to threaten low-defense backliners. It requires some correct timing to be most effective, as opponents may move out of range causing it to fizzle, so it's best used when you can predict where an opponent has to go (next to a minion or ally). While it allows for Rowenna to position well, it also offers the enemy a choice to run away while earning Rowenna money. This choice can be devastating and lead to enemies moving in on Rowenna's teammates, so it always has to be considered.

Green — Primary: Close Quarters
After movement, if you are adjacent to an enemy hero, you may choose one —
>>Place a friendly minion in radius into a space adjacent to that enemy hero.
>>Place an enemy minion in radius into a space adjacent to you.

A push-oriented card, this lets Rowenna control minions around the battlefield. It's a card that utilizes her high defense, as she can give herself extra targets at the cost of negative minion modifiers. Occasionally it will let her threaten kills by placing allied minions near enemies, but this also hands them a free target since they usually can outspeed Rowenna. In the late game, this card can set Rowenna up for the whole round with plenty of minion targets, so that she can afford to stand still and trigger other abilities or effects more easily.

Green — Alternate: Opening Shots
If both you and an enemy hero in radius have no cards in the discard, that hero discards a card, if able.

An initiation card, this lets Rowenna deal ranged damage against unhurt opponents. It's strongest when on a team with a powerful finisher, since it's unlikely that Rowenna will be able to close the kills herself due to her slow speed and enemy-heal gold.

Blue — Primary: Stand Guard
Swap with a friendly unit in range which is adjacent to an enemy hero, or who has a card in the discard.

Leaning into the defender role, this card can allow Rowenna to use her healing abilities by throwing herself into danger in the first place. If fast enough, it can allow allies to play recklessly, since Rowenna can jump in front before an enemy red kills them. If timed right, it can also allow for minion denials by jumping in front of enemy reds. Rowenna often doesn't mind blocking with her own red, if she can heal it with her gold card by attacking an adjacent enemy the following turn.

Blue — Alternate: Accept Surrender
Defeat an enemy hero adjacent to you with no cards in hand.

If there is no finisher on your team, this is the card that lets Rowenna become one. A high initiative card, its most common use is eliminating wounded opponents on turn 4 by going faster than whatever they play. It can require some initiative items to go faster than opponents' blues, and can punish opponents who let it get faster than their gold cards.

Red — Primary: Token of Gratitude
Target a unit adjacent to you. After the attack: A friendly hero in radius gains 1 coin.

A team ramping card, everybody loves when Rowenna is on primary red. While a single coin might not seem like much, with some coordination it can lead to allies double levelling, sometimes on the first round. Its effect is easier to fire than the alternate red, but less powerful, so its attack stats are lower. However, this easier effect can let tier 3 double takes become more likely when going for push wins.

Red — Alternate: Feat of Bravery
Target a unit adjacent to you. After the attack: A friendly hero in radius may retrieve a discarded card.

Healing an ally while also getting to attack is a powerful combo, and can change the game state whenever it fires. Giving an ally a card back is more difficult than giving a coin, so it will take more team coordination and positioning to make this effect fire. It also means the tier 3 repeat is harder to make happen, since if there is no ally to heal, you won't be able to attack a second time. This card having higher base stats is often a reason to take it alone, since one extra track might be the difference between being able to go through an opponent's red defense or not.

Playing As Rowenna:
Rowenna is more of a support character than she looks, and requires support in return to shine. Her gold makes it difficult for her to finish kills by herself, and her double melee attacks and low movement mean that pushing the wave will always be difficult. However, she can make a great harasser, using her silver to jump to squishy opponents to force them out of minion takes. When her gold can go through opponents' blue cards, this becomes a very respectable threat. She can also be a powerful initiator, with several discard options, if she has someone on her team who can close kills.

Often games with Rowenna have less kills in general, since she has several ways to prevent her teammates from dying. This means that threatening oneshots in order to maintain wave pressure can be a primary strategy for her, since she often wants to take the final wave victory.

Playing Against Rowenna:
It's important to keep her silver jump and her blue swap in mind, as these can change the battlefield and mess up plans quickly. With her low movement, she relies on silver, and if you can predict when this will be and get out of range, she is forced to hold and get no movement, leaving her mostly out of the round. Don't be afraid to give her silver coins if the extra space means you can get a kill, avoid a death, or take an extra minion. While her ultimate is very strong, it's still hard for her to get there without her team helping out, by providing coins through cards or assist coins.`,

  mrak: `Mrak is a heavyweight disrupter, commanding powers of rock and stone. Slow and immobile, he is at his best when the action comes to him staying in the middle zone, allowing for devastating slams, effective rock walls, and tide-turning landslides. While he may not be the best pusher by taking minions, he can have strong wave presence by stone-walling opponents' attempts to attack friendlies.

Gold: Fissure
After the attack, place a rock token in each of the first three empty spaces in a straight line in the direction of the attack.

This card spews a line of rocks out from whatever is hit, which can block Mrak and his own teammates, as much as it blocks the other team. It's important to check who you might be blocking before you swing to be a helpful teammate. This card also sets up quite a bit of Mrak's kit, since his card effects trigger on adjacency to terrain and rock tokens, allowing for more control over the battlefield.

Slow but powerful, hitting for 4 means that most heroes' silvers can't defend this gold card. This allows for it to be an effective turn 4 finisher, if Mrak can get in position to expose some faults.

Silver: Stone Grip
Place exactly 3 rock tokens into empty spaces adjacent to an enemy hero in range, as far away as possible.

A high-risk high-reward card, this allows Mrak to create walls of stone around enemy heroes. This can be very effective at forcing an enemy to come towards Mrak, or blocking off an escape route. For an enemy adjacent to 3 obstacles to begin with, it will seal in the last 3 spots, blocking all movement and leaving them between rocks and a hard place. However, the card can fizzle if there are less than 3 empty spots available and no rocks will go down. The rock supply is limited to 3 tokens, so gold will remove the rocks, if used to attack later in the round.

With Mrak's low movement, playing silver can be risky since it requires standing still. This can put you out of position, if the card doesn't significantly impact the opponents.

Green — Primary: Treacherous Ground
You may move a unit in range 1 space, to a space adjacent to terrain or a rock token.

Mrak shifts the battlefield to his own advantage, moving any unit at a slow speed towards a nearby rock or terrain. This can let Mrak move an enemy hero or minion to deny a take, but also allows for Mrak to help an ally move into range of a target or out of danger. This card can let the less mobile Mrak still have great wave pressure by denying minions to the enemy team, and punish them for taking their positioning for granted.

Green — Alternate: Rolling Stone
Move any number of spaces in a straight line, ignoring obstacles, without moving through more than one empty space.

This is Mrak's mobility branch, which can let him roll across the battlefield with enough planning. It combos well with gold minion takes, since you can roll through the three rock tokens you just put down to move 4+ spaces in that direction. This card can allow Mrak to keep up with fast-pushing waves or dive deep into beach zones.

Blue — Primary: Boulder Rush
Push a token, or an enemy unit, adjacent to you 1 or 2 spaces ignoring obstacles; you may move up to 2 spaces in the direction of the push, ignoring obstacles.

Here, Mrak really throws his weight around, bodying anything out of position and following where it goes. At higher tiers, it also allows Mrak to roll past whatever he pushes, which can disrupt enemies and allow for quick repositioning for Mrak.

Blue — Alternate: Stomping Step
Move a unit in radius which is adjacent to terrain or a rock token 1 space, placing a rock token in the space it occupied.

Almost the opposite of Mrak's primary green, it allows him to move units away from terrain and rocks at higher speed. While it can be harder to trigger than the green due to requiring adjacency, it can be devastating if timed right, forcing enemies to waste attack cards by moving away their target. As a support it can be equally effective by sending an ally right into a target for a big red-card hit. While this card gives him great control over the battlefield, playing it gives up a movement card, leading to a slower playstyle.

Red — Primary: Seismic Assault
An enemy hero in radius adjacent to terrain or a rock token discards a card, or is defeated.

This is Mrak's ranged "attack", which allows him to defeat an enemy with no cards in their hand at range. Along with its high melee secondary attack, this card can be effective at zoning out wounded enemies who don't want to be near you, or near rock tokens on turn 4. Mrak's reds are both unique from a lot of other heroes, in that the attack action is a secondary action on the card; both are huge powerful attacks, but each also has its own primary action that can be used instead of attacking.

Red — Alternate: Stone Carapace
This Round: If you would discard a card from your hand, you may discard this card instead. You may discard this card to perform its defense action.

A movement action with a type of overheal, this card makes Mrak very hard to kill, allowing for boulder playstyles. With this, he can dive into dangerous situations, or hunt down fleeing enemies before striking with his gold. The ability to discard the resolved card from his board means it's both harder to card-kill Mrak, and the fact that it could be used to defend means he still gets his tanky defense from the red card whenever he wants it. The slow initiative on this card makes it great for stalking enemies who cannot defend your gold attack.

Playing As Mrak:
Mrak loves the middle zone for its numerous rocks and tight corridors. Going deep into beaches or throne zones is tough for him due to his low basic movement, and may require movement-based cards to help him be effective at getting back into the fight. He can be a melee powerhouse with strong defense, but it's tough to turn him into an initiator. Initiative can make your blue disruption easier to land, but means most heroes' green cards will go slower than yours, letting them reposition around you. Taking no initiative can be effective for stalking, since your red card likely goes slower than every enemy card except for their greens. While your gold card requires a lot of positioning to effectively wall people, it's important to look for potential angles especially when playing against enemies with low movement stats.

And always remember to be aware of what may be near terrain spaces, even the water ones — trigger your effects with stone and sand.

Playing Against Mrak:
His naturally high defense and attack mean few characters can go toe-to-toe brawling with him in straight melee combat. However, his poor movement and slow speed means that positioning effects can be devastating on him if timed right, keeping him from being able to use his skills and forcing him to move. Discards matter more when he is primary red, since he won't have access to a self heal. Anything which can zone him out or move him can force him to waste actions getting to minions. Consistent wave pressure can lead to moments where Mrak is forced into sure-death positioning, just to take minions. Heroes with the ability to ignore obstacles, place themselves at range, or swap with things will find it easier to avoid Mrak's walls and rock tokens.`,

  takahide: `Takahide is a master general, skilled in all forms of warfare, weaponry, and tactics. His basics have him switching between close range, long range, and tactical manoeuvring, making every round a little different from previous ones. The rest of his kit involves his teammates, triggering off wounded allies and allowing him to pull off a host of effects at large ranges. As most generals do, he relies heavily on his team, and shines best as a supportive tank.

Gold: Float Like a Butterfly / Sting Like a Bee / Strike Like a Tiger
Swap this card with a different gold card in your deck.

The most unique thing about Taka is his Gold cards (plural!), which forces him to swap with another whenever he performs the primary action. From a max range only hit, to a massive swing at close range, to all the movement and defense one could dream of, each card has its strengths and weaknesses. These cards fill the typical role of "Red" cards, where they go middle speed but have the potential to attack and block for high numbers.

These cards can also be a large weakness for Taka, as any round where he is on movement gold, he is limited to one attack. As Taka has no other minion-taking abilities, his wave control is weaker and he needs to make sure each of his attacks matter. It's possible to get stuck on a gold card when it's used for a secondary action, such as defense or movement, which can prevent swapping to a new one.

Silver: Bushido
Swap your gold card with a different gold card in your deck; if you swap a resolved or discarded card this way, place the new card facedown.

Complementing his gold cards, Taka has a very tanky silver card which gives him solid defense at all times. This card can help with consistency when Taka really needs a certain gold card, giving him a way to swap but lowering his largest defensive card and opening him to attacks.

Green — Primary: Come to Aid
A friendly hero in range may discard a card. If that hero has a card in the discard, you may move up to 3 spaces.

This branch allows for Taka to have great repositioning ability, making up for his low movement and giving him great finishing capability. A three movement green card is always great for chasing down a wounded opponent. However, it requires an ally to strain themselves, or already be hurt, to enable Taka's plans. And if the ally says no after being given the option, Taka is forced to hold. As with all of Taka's cards, knowing when your allies are hurt, or can afford to take the hit, is a huge part of pulling off his abilities.

Green — Alternate: Pledge of Allegiance
A friendly hero in range may discard a card. If that hero has a card in the discard, both you and that hero gain 1 coin and you may retrieve a discarded card.

Taka puts down his weapons, picks up a hoe, and becomes a farmer! With this, he can give and gain money, accelerating his team. This card works best when Taka's team is winning the waves, since he is forced to give up movement to stand still and make this card work. If he makes an ally discard at the wrong time, the coins he gets from this card will not be worth the kill coins the other team gets from executing his wounded buddy.

Blue — Primary: Proven Warrior
Choose a card in the discard of a friendly hero in radius. An enemy hero in radius discards a card of the same color, if able.

A damage dealing path, this works great against opponents with lots of discards by spreading out the hurt. Once an ally has been hit or forced to discard, Taka has a small window to try and hit the same cards out. Sometimes just having the card is enough to force opponents to play certain colors, for fear that you will discard them.

Blue — Alternate: Calculated Risk
A friendly hero in radius may discard an attack card. If that hero has a card in the discard, that hero may move up to 2 spaces.

A frightful card, especially when paired with a hard hitting ally — imagine Brogan getting to move 2 spaces before he charges, having the ability to target almost an entire zone! But this card comes with a heavy cost, requiring a previous wound or a discarded attack card. If an ally gives up an attack, it had better be worth it. This can be a difficult card to make fire due to the high value of attack cards and the large degree of communication required, but it can lead to some otherwise impossible kills.

Red — Primary: Set an Example
Target a unit adjacent to you. After the attack: A friendly hero in radius may swap their unresolved card with a card in their hand.

Always a great card, especially when paired with initiative. It lets an ally see what everyone has played, and change their mind. It gets best value when an ally is locked into a 50/50 chance with an enemy, but Taka has to be adjacent to his own target in order to activate the effect. This card is one of the main reasons Taka likes to be in the middle of the waves, so he can keep his allies in radius when he takes minions.

Red — Alternate: Spinning Blade
Target a unit adjacent to you. After the attack: This turn: Empty spaces adjacent to you count as obstacles for enemy units.

An extremely effective card at shutting down melee opponents. If Taka needs to keep enemies at bay, or an angry bear is threatening to lunge, with enough initiative this card can lock out opponents for the turn, preventing them from coming close for a turn 4 card kill, or even just getting past you.

Playing As Takahide:
Taka benefits a lot from being within range of his teammates, which is typically 3 or 4 spaces. This requires teamwork, and your allies to try and stay within range, so make sure to let them know your ranges. Taka typically dies to card-kills and not big swings, due to his high defense and low movement. This means that staying away from enemies on turn 4 is usually pretty important for him, or else having enough initiative to escape. His gold cards have a lot of damage on them, and building attack items in order to threaten massive snipes from long range can be effective as long as he is able to set up forks with minions. Forcing enemies out of positions while taking minions is crucial due to Taka's otherwise weak wave pressure.

Taka can be a tough character to play, like all supports, since you need to be aware of all of your allies' abilities as well as your own, and he largely focuses on getting and threatening kills. Teammates with heals are great, since they won't mind the occasional discard, and some characters even benefit from them. Managing what kind of Gold card you want the next round is critical to success, as it saves you from having to waste turns and defense playing silver. When Taka's able to mind-meld with his team, it's a terrifying force, and he can create kills out of thin air as he plans his way to a bloody win.

Playing Against Takahide:
Always be aware of his silver card defense and whether or not he has it in hand. Your ability to one-hit Taka largely comes down to whether or not you can beat his silver, and the answer is often not. Discards against Taka himself are useful to slow him down, and his abilities don't trigger off of his own discards. If choosing between hitting him or an opponent, keeping some of his cards offline may be reason enough to hit him.`,

  xargatha: `Xargatha the Changed was once a humble shrine priestess that took her duties seriously. One day, simple raiders attacked her shrine and stole the prized relic of her people, enraging her to such a great degree that her form changed into that of a serpentine monster. Now, she indulges in her wrath by surrounding herself with heretics to cull. As a powerful brawler and zoner, Xargatha is at her best when she is surrounded by enemy minions and heroes alike. Use her controlling abilities to lull in your foes, petrify them where they stand, and cleave your way to victory.

Gold: Cleave
Target a unit adjacent to you. After the attack: May repeat once on a different enemy hero. (You may repeat even if the original target was a minion.)

To Xargatha, 2 against 1 is a fair fight. With her mighty glaive, she carves through hordes of heretics and establishes her divinity's dominance. Oftentimes you can use this to take a minion and threaten an enemy hero. You build enough attack and the enemy heroes have to be really careful of what position they take to get minions. This can also help you get a kill by removing the minion that is giving the enemy hero +1 defense modifier and then striking the opponent. Side note: you can only take 1 minion with this gold card, so you can hit 1 minion and then 1 hero, or hit 2 heroes.

Silver: Siren's Call
Target an enemy unit not adjacent to you and in range; if able, move the target up to 3 spaces to a space adjacent to you.

Xargatha lulls an enemy minion or hero 3 spaces to a spot next to her. This card has so many uses in Xarg's kit. Think of this card more as a proactive rather than a reactive card. Think about where the enemies might end up and if you want to pull them. Usually enemies can walk away on the turn if they want to because of its slowness. Pulling enemies allows you to empower whichever red card you picked up. This allows you to take a minion with alt green if you already spent an attack and want a minion. You can use this to pull an enemy hero away from your minions to help with wave control.

Green — Primary: Charm
You may move an enemy ranged minion in radius up to 2 spaces before or after movement. Scaling: ranged minion -> melee or ranged minion -> any minion, ignoring heavy immunity.

As Xargatha snakes along the battlefield, her scales hypnotize unsuspecting minions, causing them to stumble away from safety. This card can position a minion to block someone's movement, serve up a minion to a teammate that couldn't take one, move a minion away while you retreat from a threat but leave it nearby so you can still kill it and take the money, or drag a minion to an enemy hero to set up a minion take followed by a gold hit the next turn.

The scaling on this card is very easy to miss. At tier 1 you can only move an enemy ranged minion, then melee or ranged, and finally any minion including the heavy, ignoring the immunity.

Green — Alternate: Constrict
End of Round: Defeat an enemy melee minion adjacent to you. Scaling: melee minion -> melee or ranged (never the heavy).

Like the deadly anaconda, the Changed Priestess is able to wrap her serpentine tail around minions and watch as they breathe their last breath. This card is great for the ability to take a minion without spending an attack, which lets you use your red for movement instead. You can use your silver to pull an enemy minion next to you to trigger at the end of the round, letting you use the bonus of your red to attack someone and still take a minion.

This card is a little bit of a trap because you have to sit next to a minion at the end of the round instead of positioning where you need to be next. It's a loss of tempo which can be the difference between a double push or not. The scaling on this card is also easy to miss: initially you can only kill melee minions, but at tier 3 you can get melee or ranged minions, but never the heavy.

Blue — Primary: Stone Gaze
Next turn: Enemy heroes in radius count as both heroes and terrain, and cannot perform movement actions. (If you move, the radius moves with you.) Scaling: radius.

With gorgon-like powers, Xargatha can momentarily freeze enemy heroes with her gaze alone, preventing them from using movement actions. This is a tricky card to use at first and is very hard to pull off effectively at tier 1. Try playing this when people are lined up to take a minion so that next turn they can't position to a new one — this gets easier the more radius you have. Clarification: a movement action is using the boots icon on a card. This does not prevent a hero from moving if their text allows them to do so.

Blue — Alternate: Fresh Converts
If you are adjacent to an enemy minion, you may retrieve a discarded card. Scaling: minion -> unit (includes heroes at tier 3, instead of just minions).

Xargatha is a priestess of her faith first and foremost. She knows even heretics can repent for their transgressions should they provide her a suitable offering. This is one of the more straightforward effects but a risky one, since you have to stand next to an enemy minion, making you more susceptible to attacks. Silver or primary green will help you move the minion next to you to set up a heal. This is a great counter pick if the enemy team has a lot of discards.

Red — Primary: Dangerous Slash
Target a unit adjacent to you. +1 Attack for each other enemy unit adjacent to you. (Do not count the target when calculating the attack bonus.) Scaling: bonus damage.

Surrounded? Outnumbered? Xargatha doesn't know the meaning of such words. As she looks upon the enemies around her, she knows they are but lambs to the slaughter. This card always leaves you in really interesting situations: the more surrounded you are, the more damage you do, but the more enemies there are, the more danger you are in. It's a fine line to use this effect well — this is a slow card, so it's better thought of as a way to deny space for enemies walking up instead of purely chasing the free damage.

This card is also 5 boots of movement at a very slow pace. Often you can use this card to stalk someone on turn 3, following them 5 spaces away and hitting them with gold. You can also feint being in front of a minion with red and then turn around and use it to kill someone with gold next turn.

Red — Alternate: Long Thrust
Target a unit in range; +1 range for each enemy unit adjacent to you. Scaling: repeat.

Coiling up like a viper ready to spring its trap, the Changed Priestess ignores the enemies around her to lunge towards enemies holding onto a false sense of security. Every enemy hero or minion next to you increases the range you get. You get a base of 1 (the same as melee range) but get more with every enemy minion nearby; a range item alone makes it range 2 without any enemy minions around you.

This card makes you much more vulnerable and reliant on blue to block attacks, so you have to position more carefully. Your silver and primary green help you get behind a wall of minions to snipe people across the map, but this card has much lower defense, so you have to play carefully as a result. This also pairs well with primary blue to prevent people from moving and then getting a guaranteed shot on someone unless they have a movement skill. Taking alt green alongside this card lets you snipe people and still take a minion at the end of the round.

Playing As Xargatha:
Xargatha is a very flexible hero, able to play as a brawler, initiator, or sniper depending on the card she builds into. She has some wave control, and her reds really dictate how the game is played from there — her other cards, for the most part, are all flexible to her gameplan no matter which build you go. The fresher the wave, the more possibilities she has; she wants to be in the thick of it and try to apply zoning pressure. Her reds are very slow and can be used to effectively stalk any enemy hero who has already played green in an attempt to kill them and possibly take a minion. There is a balance of how many minions you surround yourself with and staying safe.

Teammates: Anybody who likes empty spawn points and needs someone to discard for them pairs well with Xargatha.

Enemy Lineup: Xargatha doesn't like Cutter or Sabina, or anyone who punishes her for being next to enemy minions or moves minions away from her. She also doesn't like swaps. Garrus is a scary matchup.`,

  brynn: `Brynn is a trapper, hunter, and mountaineer looking to set up 3 or more things around a target to get bonus effects on her cards. Lay out objects for opponents to walk into, allowing you to spring the traps! She is a versatile character with lots of utility and the ability to be a good farmer, finisher, or support.

Before talking about any specific cards, Brynn has a theme that runs through her whole kit. Every card is functional on its own, but you have the possibility of getting bonuses by having an enemy around 3 or more obstacles. Obstacles are minions, terrain, tokens, and heroes, including yourself. The easiest way to count this is to check if they have 3 or fewer empty spaces adjacent, since counting all the things and terrain hexes directly can get confusing.

Gold: Familiar Ground
Choose one —
>>Target a unit adjacent to you.
>>Target a hero in range who is adjacent to 3 or more obstacles. (You, other heroes, minions, tokens, and terrain are obstacles.)

This is a fast gold which doesn't hit for a lot but is really good at securing a kill or hitting someone first. Brynn uses familiar terrain to spring a hidden trap at 12 initiative, range 3, if she hits the bonus. This is one of her best zoning cards — as long as you are threatening valuable spaces where heroes would be next to 3 obstacles, you can scare them away from that space just by staying in range of it, usually on turn 3, turn 4, or once you have a lot of attack items.

Silver: Decoy
Choose up to two times, on different targets —
>>Move an enemy minion in radius 1 space.
>>Move an enemy hero in radius who is adjacent to 3 or more obstacles 1 space.

This card has a few uses. Brynn can fashion a decoy from her surroundings to have enemy minions investigate over to a teammate, letting the ally use a card to possibly disrupt an enemy if they didn't have enough movement to get 2 minions otherwise. It also lets you move the minions in a way that if the enemy walks into certain spaces in a future turn, it will trigger your bonus for cards, or you can use it to immediately put an enemy around 3 or more obstacles. It can also move an enemy out of a spot for taking a minion so they have to spend another card for movement instead.

The big thing is you can use your first option to set up the second option, such as moving a minion so that an enemy hero is around 3 obstacles and then moving that hero 1 space in the same silver play. The trick is deciding whether it's worth more to move the enemy hero or leave the enemy hero set up for a 3-or-more-obstacle bonus on another card the next turn. In niche cases, the minions can also block someone's movement or create a mini wall if they play a low movement card.

Green — Primary: Bear Trap
Choose one —
>>An enemy hero adjacent to you discards a card, if able.
>>An enemy hero in radius who is adjacent to 3 or more obstacles discards a card, if able.

Brynn uses this bear trap to either throw at someone right next to her or spring it on somebody who is adjacent to 3 obstacles. Most of the time this card is used to dissuade enemies from walking up next to you. Sometimes if your allies see it on the table they can walk up next to someone to surround them with the trap and get a discard at range while someone stands next to them to pressure them. If you are able to use the 3-or-more-obstacle part of the card, you are most likely going to be able to follow up with a kill or an extra discard with a follow-up gold on the next turn.

Green — Alternate: True Grit
You may retrieve a discarded attack card. If an enemy hero in radius is adjacent to 3 or more obstacles, move up to 3 spaces.

Healing a discarded attack is a really strong effect and you get it regardless of whether or not you hit the bonus of 3 or more obstacles, but if you trigger it you also get to reposition offensively or as an escape, which is a really sweet bonus — and the bonus movement is more than if you were to use the card purely as a movement. One thing newer players miss is that the heal happens regardless of whether you hit the bonus or not, and then you also get the extra movement if you get the bonus.

Blue — Primary: Tread Lightly
Swap with either a unit adjacent to you, or with an enemy hero in radius who is adjacent to 3 or more obstacles.

This card allows you to swap with an ally so they don't get hit by a red card, or so they don't hit a minion if you want to prioritize wave control instead. With the bonus, you can gain a lot of ground, especially as waves are moving, setting your opponent back some time. There are some niche situations where if your ally can see it coming, you can swap with an enemy hero standing next to an ally, letting them hit that enemy hero with their red card. This card is harder to use when you are on alt red (ranged attack), because blue becomes your only good defense card.

Blue — Alternate: Mountain Guide
You may move a friendly unit adjacent to you up to 2 spaces. If an enemy hero in radius is adjacent to 3 or more obstacles, move a different friendly unit in radius up to 2 spaces.

This allows you to guide a minion or friendly hero through secret terrain that only you are familiar with, a few spaces at a time. The flashiest use of this is to move someone to allow them to hit an attack they otherwise couldn't hit — this requires you and your ally to be in sync with each other but can feel devastating for the other team if they didn't see it coming. This is also good for minion denial against the opponent's red card. If you trigger the bonus, you can move a second ally minion or hero at range (or the first, if you didn't have a target with the primary effect, since you can still move someone with the second part).

Red — Primary: High Ground
Target a unit adjacent to you. If you target a hero adjacent to 3 or more obstacles, +2 Attack.

This is secretly checking for another 2 obstacles beyond the target, because since this is a melee attack you will already be one of the obstacles next to the target. You spring from the rocks, netting bonus damage if you get the bonus. The bonus damage is very good, especially on such a fast red card. At tier 3 it gets really strong, since you can just pick the card back up again to use for whatever you need, like defending a counterattack or moving into a better position. This bonus effect doesn't seem to fire very often, but when it does it feels very rewarding.

Red — Alternate: Split Attack
Target a unit in range. If you target a hero who is adjacent to 3 or more obstacles, may repeat once on a different unit adjacent to you.

This card allows you to throw your hatchets at range. This is a great choice if you can't afford to be next to enemy minions because of the negative defense modifiers, or if the fights are happening more around your teammates than around you — range allows you to be more flexible. You will almost never trigger the effect at tier 2, but at tier 3 the usefulness bumps up to being able to hit 2 targets at range if you can get the bonus. If you want alt red for the item, save it for your last tier 2 card choice so you have the smallest window of reduced defense.

Playing As Brynn:
Brynn has a pretty good statline overall, and she doesn't have to get the bonuses to be effective — half the fun of playing Brynn is hunting for those bonus opportunities. Brynn really benefits from teammates who are familiar with your kit and help you set up your bonuses. The slower her cards are, the more that can change. If an enemy hero is next to one of your friendly minions, they can potentially take that minion off the board, thus turning off previously set up bonuses. The red card you decide on really dictates your playstyle. For your first few games, it's worth building a brawler style of attack and defense to get a hang of her and going primary red — your ability to defend against attacks really takes a nosedive as soon as you switch to alt red. You might want to consider taking primary blue tier 2 for defense. Also, alt green still has a valuable use in healing red if you are getting targeted with discards, not just attacks.

Brynn really relies on her blue and red to do the heavy lifting for her defense. Once those are gone, you start to feel pretty vulnerable and have to play very carefully. Her silver is a very low defense card, so try to use it at some point in the round so you're not left with only a silver on turn 4 in your hand.

Good Teammates: Brynn really likes teammates who can create more tokens on the board or have abilities to move things to help her set up her bonuses. Mrak, Tali, Mortimer, Trinkets, Wuk, and Min are some of the top heroes to look for as a partner for Brynn.`,

  widget: `Where the mad mechanic Trinkets has his trusty Turret, Widget prefers the old ways. Sure she still has an affinity for mechanical things, but she is also much more in tune with her kind's dragon roots. So much so that she never leaves the house without her emotional support dragon, Pyro. To excel at Widget is to master the incredibly potent potential of fighting as two instead of one.

Gold: Fight As One
Target a unit adjacent to you. After the attack: You may perform the primary action on one of your resolved skill cards, targeting a different unit.

After bonking a minion or hero, you are then allowed to perform the skill action of any card you have previously resolved. This card is the key to giving Widget the feeling, and power, of two separate entities on the field. The additional ability performed must be from a Skill card (Silver, Green, or Blue), it must be a previously resolved card (not discarded), and if the card requires a target (Green and Blue), it cannot be the same thing you hit with your gold attack.

It's tough to truly articulate the power of this card without going into the rest of Widget's kit — you should always be thinking about the text of your skill cards in terms of not just their printed initiative, but the initiative of your gold. You should also be thinking about the combos available to you knowing that the skill happens AFTER you have attacked something, which means you need to be playing other things before your gold for it to truly matter.

Silver: Dragon Bond
Choose one —
>>Place Pyro into a space in radius. Pyro counts as a token, but is not removed at the end of the round.
>>If Pyro is in play, move both yourself and Pyro up to 2 spaces, in any order.

Pyro is an invaluable asset to Widget, but she can't do anything if she isn't on the board. Note that the first option also details the rules for how to treat Pyro in game (her "properties"). She is considered a token (even if you are using the mini figure), and she is not removed at the end of round. As such, she is a potential target of any primary actions (good or bad) that interact with tokens, and is susceptible to the "Clear" action, where an adjacent enemy can use an attack card to instead destroy any number of adjacent tokens. In addition, if she is on a spawn point when a minion would spawn there, she must be removed.

As for the two choices, these are your main ways of getting Pyro on the board and moving. Playing this card for its ability gives you a middling initiative of 6 to reactively move both yourself and Pyro, or place Pyro, after seeing what enemies who have already resolved cards have done. It also lets you potentially thwart the plans of enemies resolving after you, typically in the form of blocking movement routes for those that played Green. Use the first option to either get Pyro back on the field, or to resummon her closer to the action. Use the second choice for a "poor man's" low-initiative move of both you and Pyro together.

In the context of Gold, this card gets even more interesting. The first option is pretty clear cut, allowing you to place Pyro nearby after having struck a target. The much more enticing action comes when Pyro is already out — not only are you able to attack an adjacent target, you now unlock an after-attack move. This can be huge for things like setting you up for a second minion or helping you dodge incoming attacks after hitting something.

Also note that Silver's defense has been swapped with the value typically occupied by a player's Blue card, so playing it means you are basically left with your Red card as your only defense against heavy hits. Careful planning of Silver + Gold, plus other swap options in her kit, can make this loss in defense manageable.

Green — Primary: Scorching Breath
An enemy hero in range of Pyro and in a straight line from Pyro discards a card, or is defeated.

Pyro is basically a flamethrower with wings. A flashy and fun card, this acts as a low-initiative zoning or punish tool against enemy heroes. Play it when you think an enemy is thinking about standing still, or use it to threaten a space they want to go. If they end up moving out of the way, no worries — just take the move action instead. You can always set them on fire later in the round. Note that both criteria for targeting involve calculating the shot from Pyro and not Widget — this card is the exception, since Widget's remaining cards are calculated from her and not Pyro.

At Gold initiative, this basically turns Pyro into a second Gold attack (or discard at lower tiers). Remember the restriction of Gold: you cannot use this Skill on the same hero you hit with the attack.

Green — Alternate: Gnaw
Defeat a minion in range adjacent to Pyro. Remove Pyro.

A similarly straightforward Green, this turns up the dial on Widget and Pyro's push capabilities. This card often requires a lot of foresight on your part to be valuable, especially when pairing it with Gold. You need to summon Pyro, move Pyro next to a minion, and be able to stand still to fire this, all of which make this card decently telegraphed to the enemy. However, when you pull it off, two minion takes at Gold initiative (such as a melee followed by a gobbled up Heavy) can create huge swings for your team.

Unlike primary green, range calculations for this card are done from Widget (though the minion still needs to be adjacent to Pyro). Tier 2 is "remove" not "defeat", so no additional coins for you until tier 3. Finally, you must remove Pyro at both tiers.

Blue — Primary: Safe Landing
You may move Pyro in range 1 space. Swap Pyro in range with yourself, or with a friendly hero in range.

While Silver will always be your primary way to move or place Pyro, both of your Blues offer more restrictive ways to affect her positioning. Your choice of Blue can also have a huge impact on the type of shenanigans you will be pulling. Primary Blue gives you an insane amount of support potential (both offensive and defensive) in repositioning Widget and her team. Is Pyro next to an enemy hero? Drop this on the same turn a friendly hero plays an attack for a surprise one shot. Enemies closing in on you? Have Pyro tag you out to safety. Note that both Pyro and the target of the swap (if it isn't Widget) must be in range of Widget.

As far as its combo potential with Gold, the initiatives are close enough that there isn't a huge speed benefit over playing it or copying it with Gold. It's more that this can either make the use cases above even spicier, or just give you a second shot at firing the text — giving you another escape option after you hit something by swapping with Pyro after the hit, or bringing in a friendly hero to help with an adjacent enemy.

Blue — Alternate: Carry Away
Move both Pyro, and an enemy unit adjacent to Pyro, either 2 or 3 spaces each, in the same direction, ignoring obstacles.

Where Primary Blue is all about the ally shenanigans, Alternate is about disrupting your enemies. Use this to pull enemies away from key minions, or drag them into a friendly hit. You can even use this to serve up an enemy minion to a friendly hero who otherwise couldn't get one. Note that at minimum, you must be able to move both Pyro and the target 2 spaces, otherwise you can't use the primary text. You can move the unit and Pyro in any order as long as they move the same amount of spaces, and end up in the same orientation that they started in.

Like the case with primary green, note that you CANNOT use this as a pseudo escape by hitting an adjacent hero and then dragging that same hero away with Pyro — the target of Gold and the subsequently fired skill action must be separate targets.

Red — Primary: Diversionary Assault
Target a unit adjacent to you. After the attack: Move Pyro up to 4 spaces.

In addition to being your other solid defense option (remember Silver is only 6 defense), this card is the best way to take even more control of Pyro's mobility and positioning. While the attack is moderately strong, don't let that stop you from using it to take minions. Its key utility is in setting up Pyro for their skills, or disrupting through positioning. Going at Red initiative, you won't always be able to set up a guaranteed action with Pyro (especially ones directed at enemy heroes), but you can still do a lot of work in threatening something, whether that be a key swap with Blue, or some potent fire breathing. It is also an incredibly good card to pair with your Alternate Green — hit a minion with this, move Pyro next to a minion, munch, repeat next round.

All the utility about moving Pyro with Silver applies here as well. Even if you don't see a way to set up a specific Pyro card, there are always opportunities to move Pyro to block enemies from key spaces, help surround enemies alongside other obstacles like minions and tokens, or just get Pyro closer to the action. It may not be as flashy as her Alternate, but do not discount the utility of this card, or even just the breathing room it gives you with its higher defense.

Red — Alternate: Airborne Assault
Before the attack: You may swap places with Pyro in radius. Target a unit adjacent to you. After the attack: You may swap places with Pyro in radius.

A swap, attack, swap. Pyro is especially mobile for such a pudgy dragon, and she is more than happy to swap places with you when the need arises. This can also be a key component of your push build, using Pyro as a swap target to get further into the current Battle Zone, and have a better chance at taking 2 minions a round.

Taking this card will give you an initiative boost as well, which can be incredibly valuable in helping set up strong Gold plays. But be sure to note the defense reduction between this and primary Red. You will have to play a lot safer (or at least more calculated) when taking this card, even if you do pick up defense items elsewhere.

Ultimate: Dragon Knight
Each time after you perform a movement action, you may perform the primary action on one of your face-up skill cards.

Since ultimates are generally rarer in games, this doesn't come up often, but its utility is pretty clear. Using any card for movement then lets you repeat any other face-up skill card's ability. You can walk with Blue then use Green to fire blast someone. Move with Green then respawn Widget next to you. Move 4 spaces with Red, then move Widget AND Pyro an additional 2 spaces by copying your face-up Silver. The possibilities are endless.

Playing As Widget:
Always be on the lookout for how to get the most mileage from your Gold. The requirement of needing to have already played skill cards may foreshadow what you want to do, but even that has power in affecting enemy actions. And with a turn 4 Gold, you can have up to 3 options available to you, which can make it much more difficult for the enemy to pin down what you intend to do.

Specifically in relation to hero kills, don't shortchange the fact that you have basically 2 different 2-boot Green cards in your hand between your Green and your Silver. Playing them back to back (leading with Silver) can help you stalk a target for a couple turns before attacking. This becomes especially good when you add a boot item to the mix.

Also, watch Pyro's back. Your cards are basically blank when Pyro is not on the field, and while there will definitely be some rounds where you just move and hit, you want that dragon out and wreaking as much havoc as possible. In turn, know what you are giving up when you play Silver (those precious shields).

Finally, communicate with your team, especially about what Blue you are on. As friendlies become acquainted with your hero, you can rely more on mind melding. However, if people don't know all you can do, or don't seem to be considering those options, don't hesitate to just call out what Blue you are on.

Playing Against Widget:
Look for when you might be better served using an attack to clear Pyro rather than do something else — situations like if you could get a minion, or prevent Widget from taking a minion, and kill Pyro in the process, especially if you don't need the money. This won't always be a viable strategy, but it is something worth watching for even if it only happens once in a game.

When Pyro isn't out, Widget will want to play Silver eventually. Look for opportunities to punish her with attacks or discards on the turn she stands still to do so. She has some brawler-like stats, but no access to a self heal, so don't hesitate to put some pressure on her. And for enemy heroes that can mess around with tokens on the board, look for ways to thwart that pesky dragon.

Leveling Suggestions:
Hold off on your choice of Red tier 2 if you can — your tier 1 Red is a respectable card, so there's no need to rush the upgrade. Get a feel for how the game is going and then level accordingly; maybe you need initiative or a little extra mobility so you go Alt Red, or maybe you are having trouble getting Pyro where she needs to be so you stick with Primary Red.

Taking Alt Red gives you 2 ways to move and attack on the same turn (the other being Silver/Primary Blue + Gold). Careful planning of card order and Pyro's positioning can make you impossible to hit, or at least very costly for your enemies to try.

Primary Blue is typically the safer Blue card to grab, as it interacts with your teammates rather than your enemies, and friendly heroes should be more inclined to help you fire your card text than enemies are. If enemies are steering clear of Pyro, consider sticking with this branch.

A quick level into tier 2 Alt Green can be huge for surprise double pushes. It won't work all the time, but if your team wins the middle wave, a sneaky level up into this can really help clean up the enemy beach — just remember you won't be getting coins for minions on tier 2 with it.

Initiative items are a worthwhile consideration, especially when it comes to your Gold. It's already a 4 attack, and initiative helps you attack and copy skills at an even faster speed. The flip side is that initiative items may mess up your Silver speed if you've been relying on that to move after other players, but that's often not too costly a tradeoff.

If you aren't quite sure what to level for tier 3, consider sticking on Primary Blue — it's reliable, and it comes with a radius item, which can be incredibly beneficial in opening up your options for Silver Pyro placement. Doubly so if you are on Alt Red.`,

  bain: `Bain the Bounty Hunter is a support character with some fun tricks up his sleeve. He has the ability to dodge lethal attacks with ease and pull out a hand crossbow to snipe his bounty, but he also hangs out by playing games of chance and celebrating his kills by sharing a round of drinks with the bar. With a gold card that makes defeats even more detrimental for his enemies, Bain's desired win condition is clear.

Gold: Dead or Alive
Target a unit adjacent to you. After the attack: You may give an enemy hero in radius a bounty marker; a hero with a bounty marker spends 1 additional life counter when defeated. (4 Attack, 4 Radius.)

This is an important card in the kit and allows you to get your bounty onto an enemy hero, which enables several other cards in your kit (Primary Green, Alt Green, Alt Red) and enables you to get more life counters out of each kill. A quick note: if you kill a player with your gold you aren't able to give them the bounty to take an extra life counter — so unlike most gold attacks that are saved to finish someone off on turn 4, Bain's gold may be better used earlier in the round to put a target on someone's back for your allies to hunt down.

Silver: Get Over Here!
Target a unit or a token in a straight line and in range with no obstacles between you and the target; move the target towards you in a straight line, until you are adjacent.

This card's best uses require synergizing with one of your teammates. You can use this card to pull an enemy right next to your ally so they can hit the enemy hero. You can use this to pull tokens for a variety of reasons (opening space, preventing an opponent from firing an effect, stopping Brynn from getting her 3-obstacle bonus). You can use this to pull an enemy minion to a safer location so that you can take it further away from the enemy, or pull a friendly minion away from an enemy hero who was about to attack it and waste their attack card.

Pulling enemy minions to you is normally a trap, as it would generally be better to be closer to the next minion instead — there are a few reasons you might not want to, covered in the playstyle notes below.

Green — Primary: Close Call
If a hero in play has a bounty marker, block the attack and that hero gives the marker to you (the marker's effect is applied to you).

Bain's block card can dodge any amount of damage as long as you have the bounty marker out. This is great if you want to focus on more attack and being aggressive rather than having to get defense items. At tier 1, using this card puts the bounty marker back on you, making you worth 1 more life counter — because of this, upgrading this green is often one of the first level up choices worth making.

Green — Alternate: Vantage Point
2+ movement action, ignore obstacles. If a hero in play has a bounty marker, +1 Movement. (Tier 3 gives +2 Movement instead.)

This is a great choice when there are lots of obstacles, such as tokens or minions, blocking your way. Getting a lot of movement on a green card is really strong in Guards of Atlantis — green cards are generally used on turn 3 to line up and get into an advantageous position, usually for an attack on turn 4, and having up to 4 boots on a slow green means you will have an easier time chasing down and collecting your bounty. Important note: you get the ignore-obstacles part of the card regardless of whether the bounty is out or not — only the bonus movement is conditional on a bounty marker.

Blue — Primary: A Game of Chance
An enemy hero in radius with two or more cards in hand chooses one of those cards; guess the card's color, then reveal the card; if you guessed correctly, discard that card; otherwise you gain 1 coin. (Scaling: radius improvement and coin reward to 2; at tier 3 you can repeat.)

This is a win-win card. Either you get a discard out of the enemy for an easier kill on turn 4, or you get money helping you level. At tier 3 you get a second chance at guessing. You have to be able to guess what's possible in their hand — the wording is there to prevent you from guessing colors like purple, which doesn't exist in the game.

Blue — Alternate: Drinking Buddies
You may have a hero in radius retrieve a discarded card. If they do, you may also retrieve a discarded card. (Tier 3 gains an end-of-turn repeat for a second chance at the discard.)

This is a good support heal for your allies, however you cannot heal yourself unless you are able to heal someone else. With the end-of-turn effect added to it, you can heal any card that was discarded after this card resolves as well, whether or not you used it to heal originally. This is strong because many powerful attacks are slower, such as those on powerful red cards, allowing you to safely heal the threatened hero before and after the fact. Note: this card says "a hero" instead of "friendly/enemy" hero, so you could heal an enemy hero in a niche situation where you desperately need to heal yourself.

Red — Primary: Light Crossbow
Target a unit in a straight line and in range with no units or terrain between you. (Scaling: every tier increases range by 1.)

This is the straight-line attack that can only shoot through tokens and no other obstacles. Ideally when playing this red you are setting up so you can hit a player if they stand there long enough, or take a minion if they don't. This is your easier card to use for farming minions while threatening enemy heroes out of position.

Red — Alternate: Hand Crossbow
Choose one —
>>Target a hero in range with a bounty marker.
>>Target a unit adjacent to you.
(Tier 3 lets you choose one or both, on different targets.)

This is the player-hunter card. Minions are tougher to take because you now have to be adjacent, but you trade that for fewer restrictions on being able to hit at range — all you need is the bounty marker. At tier 3 you are able to take a minion and shoot a hero at range 3 with a bounty marker in the same action.

Playing As Bain:
Bain plays best as more of a support character even though his kit is aligned with getting kills — you often struggle with the action economy and defense to perform solo kills. Use gold more as painting a target than as a guaranteed finisher; if you get the kill, great, but it's not the end of the world if you don't. If going for the block green branch, try to boost your initiative so you can make sure you can get your gold bounty out when you need it. Alt green is a good pick whenever there are some token-heavy heroes to get around, or to cross from the jungle to the enemy beach when trying to catch back up to the wave. Good uses of silver are what separate the better Bain pilots.`,
};

// Hard ceiling only, same reasoning as fetchRelevantHeroCards in
// lib/heroCardContext.ts — an ordinary question naming one or two heroes
// stays far under this; it only matters on an unusually broad multi-hero
// match (e.g. comparing two full three-hero drafts at once), where without
// this a request could still overflow even after the discordContext/
// rulebook fixes for that same failure mode.
const CONTEXT_TOKEN_BUDGET = 20_000;
const CONTEXT_CHAR_BUDGET = CONTEXT_TOKEN_BUDGET * 4;

export function fetchRelevantHeroGuides(heroIds: string[]): string {
  const kept = heroIds.filter((id) => HERO_GUIDES[id]);
  if (kept.length === 0) return "";

  let combined = kept.map((id) => HERO_GUIDES[id]).join("\n\n---\n\n");
  while (kept.length > 1 && combined.length > CONTEXT_CHAR_BUDGET) {
    kept.pop();
    combined = kept.map((id) => HERO_GUIDES[id]).join("\n\n---\n\n");
  }
  return combined;
}
