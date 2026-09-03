// General (non-hero-specific) Guards of Atlantis II strategy guides,
// covering topics like how the five card colors work and interact, and
// how to read the minion wave/push potential — as opposed to the
// per-hero guides in lib/heroGuides.ts. Community-written, pasted in by
// hand, one topic at a time. See app/api/chat/route.ts for how this is
// surfaced to the chatbot.
export const GENERAL_STRATEGY_GUIDES: Record<string, string> = {
  cardColors: `This is meant to be an introduction to the different colors of cards in Guards of Atlantis II. Each color has its own suite of qualities that makes it suitable for different purposes. Every hero and every matchup has its own take on making use of these cards. Still, there are some basic patterns that apply generally to all heroes.

Gold
Qualities: Highest initiative. It's an attack! Lowest defense. Lowest movement.
Functions: Force a hit on an enemy hero. Defeat a minion. Dodge an attack.

Our Gold card is our signature move, a card that will stay with us throughout the game and never changes. It's an attack that's weak but happens so early in the turn that we can be confident it will connect. At the outset, only another Gold card can respond fast enough to get out of the way. Which highlights the second significant function of the Gold card: dodging. For most heroes it can only move one space, but one space is very often the difference between a successful attack and a miss.

More complex heroes have skill cards instead of attack cards on their Gold. Generally these are still aggressive abilities that cause enemy heroes to discard cards, and that enemy heroes want to dodge. They almost always have an option to defeat an adjacent minion instead of whatever the skill would otherwise do.

While it is very hard to dodge a Gold attack, we can expect most heroes to be able to defend its attack value. So our Gold card is typically used for "initiation": to attack an enemy hero who hasn't yet discarded a card, or to attack an enemy hero who has no cards left in hand to defeat them. Any hero who discards a card will have no cards in hand on turn four, unless they get healed, so initiation is a vital tool for securing hero kills.

That demonstrates the value of dodging. Even if we've had to discard a card this round — and especially then! — if we play our Gold card on turn four we can often manage an escape. As one of our two attacks, our Gold is also quite valuable for being able to defeat a minion.

For all those great things, Gold has the lowest defense of the cards in our hand. There's plenty of incentive to play Gold at some point in the round, but just in case: it's a good idea to play Gold at some point in the round, so we don't end up needing to defend ourselves with it.

And it's worth noting that while a movement value of one means it's not great for moving over land, it is capable of fast travel. This is generally a bad idea in round one (you'll want it to defeat a minion!) but when we respawn and need to travel a long way to regroup with our team, that can be a nice way to maximize our movement in a round. It can also avoid our enemies blocking our fast travel by moving to stand in a zone we want to travel in.

Silver
Qualities: Can't move or fast travel. Low defense.
Functions: Niche skill effects, or hero setup. Discard when an enemy lands a "discard a card" effect on us. Improve our hand quality.

Our Silver card is another card that stays with us throughout the game, but this can be an awkward one as our Silver has no movement action at all. Some lucky heroes can reposition with their Silver skill, and will probably try to use it every round. For the rest of us, playing a Silver card fully commits us to using a skill action that will leave us in the same space at the end of the turn. That skill is always good where it does something, but is generally limited in the kinds of situations it can be useful to us. It often asks us to have a good read of what's about to happen.

More complex heroes are often called on to play their Silver to enable their kit. These heroes often reference tokens or other things that only come up after they use their Silver card.

Because it has a very low defense value, it's important to keep in mind that any round we don't play our Silver is a round where it's our only card left in hand on turn four. That isn't a problem if we're positioning carefully to avoid enemy attacks, or if the enemy team is focusing its attacks elsewhere. But most of the time it's best if we plan to find the time to use our Silver in the round, even if it's to spend a turn doing nothing.

For all of these reasons, any time a hero is called on to "discard a card", we can expect that hero to discard Silver if they can. In most cases, a non-Silver card will be more useful for avoiding death later in the round.

Red
Qualities: Highest defense. Powerful or long-range attack. Farthest movement. Low initiative.
Functions: Attack a hero. Defeat a minion. Move a long distance in a single action. Defend big attacks.

Our Red is the biggest and flashiest card in our hand. Whatever we do with Red, it's going to be great. If we have to defend a big attack, we can rely on Red to save us. If we need to get moving to a new zone, Red will get us there now. And when we hit an enemy with it, they have to have kept high defenses in hand to survive our Red's blow. Or, it might have a long range instead of a very high attack value, and be difficult to dodge instead of difficult to defend.

That said, it has a low initiative value. Half of the cards in an enemy hero's hand have a better initiative than it, so if they're picking cards at random we can expect them to be able to see our Red on the table and get to go before us half of the time. And people are probably doing better than playing cards at random.

So when attacking with Red it's often best to set up to have multiple targets we can hit with it. Maybe one of two heroes can get caught out with it, or will decide they'd rather stand still and do what they planned than abandon their plan to dodge us. Or, if nothing else, minions won't dodge.

It's hard to pass up the opportunity to use that powerful attack, or to let it leave our hand when holding it for defense keeps us so safe, but playing it to move is a powerful option, too. A Red move can bring us very suddenly across the map, and only heroes that played Green that turn can react to our new position after we move. A surprise Red move into a Gold kill catches people off-guard often.

Blue
Qualities: High initiative. High defense. Good movement.
Functions: Defend big attacks. Move a good distance. Disruptive skills.

Our Blue is an all-around great card. It's fast enough to dodge Red attacks, it often has enough defense to defend them, and for most heroes it moves a significant number of spaces.

The abilities on the card are usually designed to be disruptive effects. Things that we catch other heroes with to limit the options they have this turn, like an ability that restricts them to moving only one space, or prevents them from moving at all.

Another class of notable Blue skill effects is those that tell an enemy hero to discard a card. These are terrific for initiation against heroes, since most cards aren't able to dodge them, and making the attempt doesn't spend a valuable Gold or Red attack. And when fully upgraded many of these can defeat heroes without cards in hand, filling out that initiation role.

All that said, most often Blues are held to be able to defend or used to move into the action. It's reasonably common for us to hold on to Blue until turn four, and then if we're safe we can play it on turn four to reposition for the next round.

Green
Qualities: Lowest initiative.
Functions: Set up our position. Reactive skills.

Our Green can look like a terrible card for all its numbers being so small. Its initiative is so low that we're committing to let our enemies do what they want before we can do anything this turn. The defense is so-so; enough to defend a Gold attack but not enough to defend a Red attack. Moving two spaces is okay but means we're likely to stay in the same local area of the map.

The great value of our Green card is in its initiative. Going last in the turn order means we can react after everyone else has made their moves. We get to set up perfectly for the next turn, knowing exactly where everything will be when the next turn begins. This makes playing Green before playing an attack a very popular line.

Skills on Green cards tend to let us move units on the board around, a lot of "swap with a unit" or "move a minion" kind of effects. Heals are fairly common on Green cards, too, where they let us predict incoming attacks and heal the damage the same turn it's applied. There are "discard a card" abilities on Green cards, but they play more like Red attacks: threats we put out on the board to make enemies scatter, and if there are no targets when it's time to resolve our Green then we just move with it; win-win.

Combinations
There's a lot of overlap between cards in our hand. We generally have two cards in our hand that are suitable for any given purpose. So as we play our cards, or are forced to discard them, we shape our hand as far as what purposes we're still useful for, and what we aren't. Below are significant pairs of cards, and the things to think about when missing both of those cards in hand, or when those are the only cards left to play. These are also useful things to think about when an enemy has played or discarded both of these cards, or is left with only these cards in hand.

Gold & Silver: If we're left with just these cards in hand, we had better be in control of the situation. These are our most restricted cards in terms of mobility and defense. In this situation our position is mostly set and taking any attacks is a dangerous prospect (for most heroes in most matchups).

Silver & Green: Similar to Gold & Silver, when we're left holding only these two cards we are quite vulnerable. While our Green can do more to reposition us, it can only do so toward the end of the turn, after any Gold and Red attacks have resolved. Between that and Silver not moving us at all, we're a slow moving target for our enemies to hit. If we're already safe then we're doing okay, as Green movements can keep us safe into the next turn. And Green's defense can be enough to successfully defend a Gold attack, if it comes to that.

Gold & Red: These are our two attacks. Once they're out of our hand, our ability to interact with enemy heroes is limited to our skills, and to taking up space on the map; we no longer present a killing threat to enemy heroes. Most heroes have only those two opportunities to earn coins, too. And for most heroes these are the only two cards that can remove minions. The amount of pressure this puts on our attacks depends a bit on the player count. Our two attacks can represent as much as half of our team's total attacks or as little as a fifth of them. Still, it's good to assess whether our attack will result in a kill, or would be better off taking out a minion. Of course, if we can't use that attack to defeat a minion this round anyway, we may as well hit a hero with it.

Gold & Blue: These are the fast cards in our hand, the ones that we can play and be confident will let us resolve our card before any Red attacks can affect us. If we have both of these cards, we're very comfortable. If we're without them, we're either in control or leaning on our Red's defense this round.

Red & Blue: These are the tanky cards in our hand, the ones we can be confident have enough defense to keep us safe. They're also the mobile cards that let us disengage or engage with our enemies as we need. If these are our last two cards, we're feeling pretty comfortable. Any time we look at our hand and are missing both of these, we have to be very careful. Thankfully, if we're under threat now our Gold can dodge, and if we're not threatened now our Green can make sure we're still safe next turn. So we're only in real trouble if we're being threatened for multiple turns in a row.

Red & Green: These two are our low initiative cards. Once they're out of our hand, our ability to control our engagements is very limited, since enemy heroes will likely be resolving cards after we do. This means we will likely continue to go first in the turn, so we're probably safe from threats, but there's a good chance we'll have to stay on the move and won't have the chance to stand still and attack or use our skills.

Considerations

Statlines
All of this has been written thinking about a hero that's our equal in terms of our stats. Unfortunately, this is rarely the case in game situations. When we take the differences between heroes into account, it can shift the way our cards interact, like how our Blue interacts with their Red. The hero dashboards and profile cards let us see the statlines different heroes have on a scale from 1 to 8. Each statline affects the values of that type on all of the cards that hero has. So when we're assessing a hero matchup it's useful to compare their opposing statlines.

Movement to movement: This statline matchup is relatively straightforward: more movement means you can cross longer distances with fewer actions. A hero with very low movement no longer sees Blue having better movement than Green, and Red begins to feel much the same. This can affect the roles these cards play for those heroes, such as Blue no longer being more valuable than Green as a repositioning card. The most important feature is that those rare heroes with extremely high movement can move three spaces with Green. Typically, a hero that played Blue can disengage with a hero that played Green by moving farther than them. But a hero with a three movement Green can pursue them with ease.

Initiative to initiative: Any initiative statline advantage will mean that at least some of their cards have a better initiative value, so they no longer rely on the tiebreaker to go first on a turn when they and their enemy both played Red, or to go second when they both played Green. Whether or not our Gold can dodge our enemy's Gold will turn on this statline matchup. When there is a significant disparity in initiative statlines between two heroes, somewhere around a difference of three or greater, the advantaged hero might start seeing their Red tie their enemy's Blue, and their Blue tie their enemy's Gold. This significantly shifts the roles these cards have. For example, instead of playing our Blue card to dodge an enemy's Red attack, we may be forced to hold on to Blue to defend.

Attack to defense: When a hero attacks another hero, and their attack and defense statlines are even, a melee Gold attack is defended by Green, and a melee Red attack is defended by Blue or Red. Ranged attacks typically have reduced attack values, so most ranged Gold attacks can be defended with Silver and Gold, too, and most ranged Red attacks can be defended with Green, Blue, or Red. As a disparity between the attacker's attack statline and the defender's defense statline grows, this dynamic shifts. When it's to a defender's advantage, we start to see Silver and Gold defend against Gold attacks, and Green defend against Red. When it's to an attacker's advantage, we start to see Blues and Reds become necessary to defend Gold attacks, and Red attacks might become impossible to defend.

Modifiers

Items: Just as with the statlines on our dashboards, item builds are a central part of how we assess the roles our cards can play. Item advantages play out the same way that our base statline advantages play out, but in a way that's dynamic over the course of the game. This is where we have control over how we want to approach the matchup, over what kinds of uses we want to put our cards to. Taking defense items will let our Silver start defending attacks, freeing us up to use whichever cards we like. Or taking initiative items will make our Gold un-dodgeable and our Red attack start resolving before our enemy's Blue. Attack items let us put more pressure on our enemy to hold good defense in hand, or start overcoming it entirely. And the movement item can give us that valuable three movement on Green as discussed in the "movement to movement" comparison above, while also letting our Blue disengage from high movement Greens (and generally opening up our options when moving with any non-Silver card).

We can use a rough guideline about the difference between our opposing items. If our opposed statlines started even, a one item advantage takes a lead, a two item advantage secures that lead, and a three item advantage seals it (possibly reaching overkill). If our hero had the base statline lead, but falls behind by one item, we can expect to be even. If we fall behind by two items, the enemy has taken the lead, and at three items they've secured it. Of course, any items we take later will claw our lead back. And if our hero started out behind, any item lead our enemy takes is about them securing that advantage against our own item upgrades.

Another way to approach thinking about items is relating them to those statlines displayed on our dashboard. Each item a hero has buffs that hero's statline by about three dots.

More items in a stat isn't always just better. Initiative items have one unfortunate side effect. As our cards resolve earlier in the turn, our enemies begin resolving after us. There can be a danger that our enemies always go last in the round, and we never have the ability to threaten them. When this reaches its worst extent, the only time we resolve after anybody is when we're the only hero who played Green. Playing it at an unusual time can be our only recourse.

Card tier: As we level up our hero, we get to upgrade our cards, augmenting their abilities and possibly swapping them out for new ones. The most important part of the upgrade for our purposes is the way that the values on each card will improve. Cards start at tier one, and can be upgraded twice up to tier three. Each value on that card will get one better, on either the first or second upgrade. A change in value of one doesn't affect our internal evaluation of our cards much. But there are times when a tier upgrade and advantage over another hero can create an overlap the same way that an item advantage can. It can be useful to watch for important shifts, like our Blue initiative might start lining up with our enemy's Gold, or our Red attack might start pushing past our enemy's Blue defense.

Minions, tokens, and abilities: Other effects can adjust the way we look at our cards. Minion defense modifiers from our friendly minions let our low defense cards start doing work, or from our enemy minions can put more pressure on us to use our Blue and Red cards to defend. Some tokens and active effects on cards can adjust our initiatives and defenses, too. These all can affect how we look at the cards in our hand.

Exceptions

Warm & Cool Reds: There are two different types of Red cards in this game — call them Warm Reds and Cool Reds, based on whether their defense value resembles a Green or Blue card. When upgrading cards, we can choose between two options for what ability we want to have. Red cards typically come in two varieties: a card with a weak attack that's easy to land, or a card with a strong attack that's hard to land. A Warm Red is the weak one, and it will have an attack value like a Gold card, and a defense value like their Green card. A Cool Red is the strong one, and it will have a much higher attack value and a defense value like their Blue card.

These Reds will play the same as any other Red when it comes to movement and initiative. But when it comes to attack and defense, it's presenting us a choice. Do we want to trade out our Red's high defense for a Green-like defense to get another initiation kind of attack? Or do we want to keep that great defense value and scary attack, even if it's easy to dodge? Making that trade generally makes us a ranged attacker that doesn't need to move quite so much, but puts us under a lot of pressure to hold on to our Blue card to defend. Not making that trade generally means we're a melee hero, which instead puts that pressure on playing our Blue card to move us into position.

Block defenses: Some heroes have access to special defense actions that block incoming attacks entirely, where it doesn't matter what the attack or defense values are. These are usually conditional, but for our purposes they change how we view our hand and play our cards. When it's a Blue card that can block, it was already a card we were thinking of holding for defense anyway. Between the outright block and lacking a skill ability we'd want to try for at times, it makes us value holding that card to defend a little more.

A block defense on Green has a more dramatic impact. This fundamentally shifts how we look at our hand. Putting an infinite defense value on Green means we no longer have to be careful about playing Red & Blue in the same round. The tradeoff is that relying on it for defense means we aren't playing our low initiative card, and it's similar to playing without Red & Green in hand. However, if we're safe when playing cards on turn three, we can play Green and be confident that we'll still be safe on turn four.`,

  pushPotential: `Two of the three win conditions in Guards of Atlantis II are directly focused on defeating minions. Whether you plan an early/mid-game push for the enemy Throne, or aim to win the decisive minion battle at the end of the game, it always helps to understand the core principles of managing the minion wave.

Push Potential
The Push Potential is how many enemy minions your team can remove until the round ends. Since the majority of heroes in Guards II have only two actions capable of defeating minions (there are exceptions), we can assume that both teams start the round with roughly the same push potential of two minions per hero.

Not all heroes are created equal though, and while their push potential is roughly the same, the ability to reach the full push potential is different. Low-mobility melee heroes are less likely to take two minions each round, while high-mobility ranged heroes are more likely, since they are less affected by positioning and minion placement. High-initiative heroes tend to be less susceptible to disables and disruption effects, while high-defense heroes are less likely to be forced to spend their attack cards to defend. Some heroes are capable of defeating more than the standard two minions per round. Others can respawn and protect friendly minions.

The push potential is not constant though. As you and other heroes play cards, move, use skills, and attack each other, your push potentials go down. Tracking your own, as well as the enemy's push potential is important and will help you to know when you need to farm minions, when you need to rush to defend your Throne, and when you have an opportunity for a team fight.

While you might not be able to accurately evaluate enemy push potential at first, you are more than capable of calculating your own. Plan your perfect round. Imagine a sequence of cards that allows you to defeat the most minions, using the least actions. You can correct your plan and re-evaluate your push potential as the round unfolds, but having at least a general idea for the round will be of great help.

Pro tip: The easiest way to lose your Push Potential is to not communicate with your allies which minions you plan to take this round, or to defeat a minion that was pivotal to your teammate's plan for the round. It's a team game! Talk to your teammates!

As for evaluating the enemy push potential, there is a very simple rule of thumb. While you may not know all the capabilities of enemy heroes, in most cases, they have to use their Red and Gold card to take minions. Look at their dashboards. Your opponent spent a Red card without taking a minion? That's a minus one to their push potential. Both their Red and Gold are played? Their push potential is now zero! Another thing to look out for is positioning. Most heroes can move either 2 or 3 spaces with their Blue card and only 2 with their Green. Depending on positioning, the enemy hero might be too far away to take two minions, even if they still have their Red and Gold cards.

Minion Advantage
Now that you've learned how to calculate the Push Potential, look at the board state. Then, assuming that both teams will realize their current push potential, how many minions will remain for each team by the end of round? If you will end up with more minions standing, it means that you have a Minion Advantage. Having one minion advantage makes winning the push very likely. Two minion advantage almost guarantees it.

Knowing that someone has minion advantage tells you two things. First of all, it tells you where the future Battle zone is likely going to be, and that's where you need to be moving towards. If you see that the enemy team's minion advantage is going to be two or more, it might be a good idea to use your red for movement, even if it means not taking a minion, or not attacking an enemy hero.

The exception to this is when each team only has a few minions left. In that case, you need to figure out when is the earliest the enemy team can take the Heavy minion. If your team can't beat them to it, it's time to get moving towards the next battle zone. The easiest way to lose the game is to miscalculate the push direction and get stranded on the wrong side of the board.

Secondly, having a Minion Advantage usually tells you that you have an "Opening".

Space Created
An Opening is a board state when you have a minion advantage and can allow yourself to spend your attack cards on other things, such as taking a more beneficial position for the future push, or to fight enemy heroes. It doesn't mean that you cannot fight enemy heroes when you don't have a minion advantage, it is simply much easier (and less risky) when you do. Your opponents will have to choose between fighting you and losing the push (since attacking always lowers your Push potential), or not fighting you and playing defensively, which makes landing your attacks that much easier. This is especially true when you are assaulting the enemy pre-throne, since they cannot afford to lose that push.

Interestingly, when you have an opening it might be in your best interest to avoid taking more minions, letting the wave push by itself (the slower, the better). This is especially true in the center battle zone. While it might be tempting to take the 4 coins for defeating that heavy minion, doing so means that you start the next wave with the defending team having a Minion Advantage of two (they have one extra minion in that battle zone, and they remove one of yours during minion battle). Which, as we've just learned, gives them an opening. So only do this if you can stabilize the wave, by defeating one more of their minions, right after the lane is pushed, but before that round's minion battle.

Conclusion: Plan which minions you want to defeat each round. Talk to your teammates about it. Be aware of the changing push potential. Read the board state, see who has the Minion Advantage and don't miss your Openings. These few paragraphs of course only cover the very basics, but they should give a solid foundation for reading the minion wave.`,
};
