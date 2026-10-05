// Authored alternate-history fiction. Public UFO folklore is inspiration, not a factual claim.
const choice=(id,label,text,cost,effects,extra={})=>({id,label,text,cost,effects,...extra});
const C=choice;
const timeline=[
 ['first_recovery',1947,'A small crash. A big problem.','A human recovery team has found a piece of Network hardware in New Mexico. Their first press release is already too enthusiastic.','840',[
 C('retrieve','Collect the evidence','Send a recovery team. Expensive, but the object stays out of a laboratory.',{energy:18,intel:10},{exotic:2,belief:2,coherence:-2},{requires:'recovery'}),
 C('liaison','Meet the people in uniform','Trade a fragment for a discreet backchannel.',{influence:4},{contact:2,trust:18,knowledge:22,belief:4,artifact:1,flag:'recovery_deal'}),
 C('weather','An ambitious weather balloon','Leave the hardware and give the public a much duller story.',{}, {belief:6,coherence:-4,evidence:3,knowledge:25,artifact:1,flag:'balloon_1947'})]],
 ['capital_sky',1952,'Unscheduled visitors','Several human radar stations have registered the same unusual track. Someone has underlined SAME three times.','840',[
 C('quiet','Go quiet for a while','Spend energy rerouting the observation network.',{energy:16},{coherence:-4,belief:1}),
 C('science','Encourage a careful study','The humans get data. You get a less frightened scientific contact.',{intel:10},{trust:8,intel:18,evidence:3,knowledge:8}),
 C('watch','Observe their response','A useful experiment, with a conspicuous paper trail.',{}, {intel:16,belief:8,evidence:4,knowledge:6})]],
 ['azure_file',1954,'Project Azure File','A military office has acquired filing cabinets specifically for things that allegedly do not exist. The budget is surprisingly respectable.','840',[
 C('noise','Send them the boring cases','Clouds, reflections and an exceptionally persuasive kite.',{influence:8},{coherence:-7,belief:3,noise:1}),
 C('access','Cultivate an archivist','Human bureaucracy can be an information source.',{intel:12},{insight:15,intel:8,knowledge:4}),
 C('ignore','Let them investigate','No intervention. Their investigation becomes better organized.',{}, {knowledge:9,coherence:4})]],
 ['space_race',1957,'The neighbors are going upstairs','A small human satellite has crossed above the atmosphere. It beeps. The Network would prefer that it did not.','643',[
 C('map','Map the orbital traffic','Buy useful intelligence with a modest operational signature.',{energy:12},{intel:20,pattern:1}),
 C('share','Offer a navigation hint','A discreet scientific contribution creates an opening.',{intel:10},{trust:12,dependence:6,contact:1,humanResearch:3}),
 C('hide','Move to the night shift','Avoid extra attention for now.',{}, {energy:-8,belief:-1})]],
 ['deep_listener',1960,'Something beneath the water','A naval survey has recorded a clean mechanical rhythm below a supposedly empty patch of ocean.','826',[
 C('mask','Change the rhythm','Recalibrate emissions before the next survey.',{rare:3,energy:12},{pattern:-4,coherence:-2}),
 C('wildlife','Blame an unusual whale','A pleasantly biological explanation.',{influence:5},{belief:2,coherence:-4,noise:1}),
 C('learn','Listen back','Learn how their new sonar works.',{}, {intel:16,knowledge:8,evidence:2})]],
 ['nuclear_standoff',1962,'A species-level close call','Human command networks are exceptionally tense. Your projection models disagree about tomorrow.','840',[
 C('help','Quietly stabilize communications','Help humans hear each other. Do not touch their launch controls.',{energy:20,intel:12},{welfare:8,intervention:3,trust:8,relief:1,knowledge:4}),
 C('signal','Send an unmistakable warning','Effective, but impossible to call completely natural.',{energy:15},{welfare:6,intervention:2,evidence:5,belief:8,panic:4}),
 C('observe','Respect the observation directive','They must make this decision themselves.',{}, {autonomy:3,intel:12,welfare:-3})]],
 ['nuclear_watch',1967,'The very sensitive fence','A field test has been noticed near a restricted installation. Human technicians have stopped blaming the wiring.','840',[
 C('withdraw','Withdraw the equipment','End the experiment cleanly.',{energy:10},{hostility:-4,coherence:-2}),
 C('explain','Use the backchannel','Partners dislike surprises, but appreciate explanations.',{influence:8},{trust:7,knowledge:10},{requires:'contact'}),
 C('continue','Finish the measurements','Knowledge gained. Goodwill not included.',{}, {intel:22,knowledge:12,hostility:9,evidence:3,coercion:2})]],
 ['lunar_landing',1969,'One small inconvenience','Human boots have reached the Moon. The empty-neighbor assumption has officially expired.','840',[
 C('monitor','Welcome them from a distance','Observe without interfering.',{energy:10},{intel:24,autonomy:2}),
 C('relocate','Relocate legacy beacons','A quiet bit of lunar housekeeping.',{common:6,rare:3},{pattern:-5,coherence:-2}),
 C('share','Leave a scientific clue','Not a spacecraft. Just enough to encourage curiosity.',{}, {humanResearch:6,trust:4,belief:4})]],
 ['energy_shock',1973,'Humans have a supply problem','Energy markets are unsettled. Your front companies see an opportunity and a rather sensitive audit trail.','682',[
 C('relief','Support essential infrastructure','Stability is useful to everyone.',{capital:20,common:5},{trust:15,welfare:5,relief:1,dependence:4}),
 C('trade','Take the opportunity','A profitable quarter with an unusual market footprint.',{intel:8},{capital:32,footprint:12}),
 C('independent','Stay independent','Harvest reserve fuel instead.',{energy:8},{nuclear:4})]],
 ['cattle_panic',1976,'The cows have a publicist','Regional newspapers have connected several strange livestock reports. Your sampling protocols receive an unfavorable review.','840',[
 C('ethical','Switch to non-invasive samples','Less efficient, much better neighbors.',{bio:4,energy:8},{welfare:3,autonomy:2,coherence:-3}),
 C('noise','Add a thoroughly implausible theory','They may believe more and agree less.',{influence:8},{belief:6,coherence:-7,panic:3,noise:1}),
 C('pause','Suspend the local survey','Lose some data, avoid escalating the story.',{}, {intel:-6,belief:-2})]],
 ['forest_landing',1980,'Not an ordinary walk in the woods','A military witness has recorded lights near an active base. The account is annoyingly specific.','826',[
 C('recover','Secure the instrument log','Reclaim the trace before it becomes a durable case.',{intel:15,energy:12},{coherence:-3,evidence:-3},{requires:'recovery'}),
 C('contact','Speak with the liaison','A new channel, and more classified knowledge.',{influence:8},{contact:2,trust:10,knowledge:15,belief:3}),
 C('lighthouse','An exceptionally mobile lighthouse','Some humans will accept this. Others will write books.',{}, {coherence:-3,belief:7,evidence:3,noise:1})]],
 ['home_computers',1983,'A computer in every spare room','Humans can now store their own files. Many have chosen to store files about you.','392',[
 C('learn','Study the new networks','A sensible investment in an inconvenient development.',{energy:10},{intel:22}),
 C('partner','Support a modest technology venture','Capital and dependency grow together.',{rare:4,intel:8},{capital:25,dependence:7,humanResearch:5}),
 C('quiet','Keep the paper covers','No immediate cost. A future pattern becomes harder to disguise.',{}, {pattern:4})]],
 ['supply_audit',1986,'Three companies, one peculiar invoice','An auditor has noticed that unrelated suppliers use exactly the same rounding conventions.','276',[
 C('fix','Let human accountants fix it','An excellent time to respect local expertise.',{capital:14},{footprint:-16,pattern:-4}),
 C('move','Diversify procurement','Use a new logistics chain.',{intel:14,influence:5},{footprint:-10,pattern:-2}),
 C('dismiss','It is only a rounding error','The auditor is not reassured.',{}, {footprint:10,coherence:3})]],
 ['rob_lazer',1989,'The technician is talking','Rob Lazer describes a recovered propulsion system on television. Half the technical details are wrong. The other half are more troublesome.','840',[
 C('allow','Let him speak','His uncertainty keeps the fragments from becoming one clear picture.',{}, {belief:9,coherence:-3,evidence:1}),
 C('fragment','Release a contradictory diagram','A smaller truth hidden inside a larger argument.',{influence:12,intel:6},{coherence:-9,belief:5,noise:1}),
 C('protect','Protect the source, contain the hardware','Accept scrutiny without adding a disappearance to the story.',{energy:12,intel:14},{trust:5,coherence:4,evidence:2,autonomy:2})]],
 ['new_directorate',1991,'The office has a new sign','Institutions are changing. Old agreements and older artifacts do not automatically arrive at the same new desk.','643',[
 C('renew','Reintroduce the Network','A patient explanation for a new leadership.',{influence:10,intel:8},{trust:15,hostility:-8}),
 C('salvage','Recover an abandoned cache','A brief window in a confused archive.',{energy:14},{exotic:3,rare:5,knowledge:6}),
 C('wait','Wait for the paperwork','Some old trust disappears with the previous liaison.',{}, {trust:-8,hostility:4})]],
 ['digital_web',1994,'The conspiracy has a homepage','Separate witness circles are finding one another. Some have also discovered animated backgrounds.','840',[
 C('context','Make careful explanations available','Provide useful context without denying every odd event.',{intel:10,influence:8},{panic:-5,coherence:-3,trust:3}),
 C('entropy','Add seventeen competing theories','The web is now slightly more like the web.',{influence:12},{coherence:-10,belief:8,noise:1}),
 C('listen','Map the community','An investment in intelligence rather than concealment.',{}, {intel:18,coherence:5})]],
 ['desert_lights',1997,'An excellent evening to look up','A long formation of lights has drawn a large civilian audience. Somebody brought a camera.','840',[
 C('redirect','Stage a mundane follow-up','A plausible alternative, not the destruction of existing recordings.',{energy:16,influence:8},{coherence:-5,belief:5,evidence:2}),
 C('data','Keep the observation data','Good science. Less good public relations.',{}, {intel:25,evidence:5,belief:10}),
 C('apology','Use an established liaison','Allow the partner to contain what it can.',{influence:10},{knowledge:12,trust:3,evidence:1},{requires:'contact'})]],
 ['disclosure_forum',2001,'The witnesses have booked a room','An organized witness forum turns isolated accounts into a common public story.','840',[
 C('monitor','Monitor the source network','Discover where independent evidence really exists.',{intel:10},{insight:20,coherence:3}),
 C('noise','Let weaker stories dominate','Useful confusion, with a growing pattern of intervention.',{influence:14},{coherence:-8,belief:7,noise:1}),
 C('respect','Let the testimony stand','No intervention. Trust grows, as does attention.',{}, {trust:5,belief:8,coherence:5,autonomy:2})]],
 ['carrier_echo',2004,'A very curious pilot','A naval aircraft has approached an unusual track. David Flavor has visual contact, a clear view and excellent recall.','840',[
 C('evade','Withdraw without a demonstration','Lose useful survey data, avoid showing off.',{energy:18},{intel:6,knowledge:7,evidence:1}),
 C('observe','Measure the response','The footage will not remain classified forever.',{}, {intel:28,knowledge:18,evidence:3,flag:'carrier_archive'}),
 C('signal','A small, deliberate greeting','Not hostile. Not subtle either.',{energy:12},{trust:7,belief:5,evidence:6,knowledge:12,flag:'carrier_archive'})]],
 ['camera_pockets',2007,'They put cameras in their pockets','A significant fraction of humanity is becoming a mobile recording network. Image quality varies; enthusiasm does not.','410',[
 C('adapt','Update flight doctrine','Reduce signatures and learn their new habits.',{intel:16,rare:4},{pattern:-5,coherence:-3}),
 C('mundane','Normalize unusual lights','Not every light is an emergency.',{influence:10},{belief:6,panic:-5,coherence:-3}),
 C('old','Keep the existing routes','Save resources now; accept a few additional records.',{}, {evidence:4,pattern:5})]],
 ['roe_first',2010,'The long conversation','Roe Jogan has invited a guest who knows a guest who has seen your hardware. The scheduled duration is not comforting.','840',[
 C('curiosity','Give curiosity some room','A less frightened audience is worth something.',{}, {belief:8,trust:4,coherence:3}),
 C('context','Support a careful scientific guest','Better methods, less panic, and more serious questions.',{intel:15,influence:8},{trust:8,panic:-6,coherence:4}),
 C('tangent','A fascinating unrelated rabbit hole','Reach rises while the trail gets less direct.',{influence:14},{coherence:-7,belief:6,noise:1})]],
 ['private_launch',2013,'More people upstairs','Space observation is no longer restricted to a small set of state institutions. Private operators have their own sensors and incentives.','840',[
 C('route','Rework orbital logistics','A costly but quiet network adjustment.',{energy:25,rare:5},{pattern:-7}),
 C('contract','Become an ordinary subcontractor','A legal foothold with a technological cost.',{intel:15,influence:10},{capital:30,dependence:8,humanResearch:5}),
 C('watch','Let the observers observe','They learn more about unusual tracks.',{}, {knowledge:8,evidence:3})]],
 ['pilot_network',2015,'It is now a safety issue','Ryan Groves has organized recurring reports into an institutional pattern. Ridicule is proving to be a poor aviation-safety policy.','840',[
 C('safe','Reduce risk near human traffic','Safer procedures and less valuable surveillance.',{intel:10,energy:12},{welfare:3,trust:5,pattern:-3}),
 C('liaise','Open a technical safety channel','Cooperation creates a new official record.',{influence:10},{trust:12,knowledge:12,contact:2}),
 C('deny','Dismiss the pattern','Short-term ambiguity, long-term institutional frustration.',{}, {coherence:-2,hostility:8,belief:5})]],
 ['naval_leak',2017,'That footage is public now','Tim DeLong and former officials have made old naval footage a mainstream subject. Your archive retention policy has become a public problem.','840',[
 C('context','Acknowledge the uncertainty','Avoid implausible denial. Invite patience.',{influence:15},{belief:9,panic:-4,trust:5,evidence:4}),
 C('fog','Surround it with contradictory stories','The record remains, but the explanation fragments.',{influence:20,intel:8},{belief:12,coherence:-12,evidence:4,noise:2}),
 C('prepare','Begin preparing for contact','A more coherent picture, and a less hostile audience.',{intel:12},{belief:12,coherence:8,trust:12,evidence:5,disclosureIntent:1})]],
 ['official_process',2020,'An official form for impossible things','Governments are standardizing anomaly reports. Similar incidents will now arrive in comparable boxes.','840',[
 C('retool','Change the detectable patterns','A systems problem deserves a systems response.',{rare:6,intel:20},{pattern:-10}),
 C('cooperate','Offer a limited briefing','A larger classified audience and improved trust.',{influence:14},{trust:12,knowledge:16,dependence:5}),
 C('ignore','It is only another committee','An inexpensive assessment, and not a very good one.',{}, {coherence:7,knowledge:10})]],
 ['gavin_hearing',2023,'The departments are disagreeing in public','Gavin Crush tells an oversight hearing that recovery programs exist outside ordinary reporting. Several people now want the same documents.','840',[
 C('open','Encourage accountable oversight','Partners may prefer daylight to another cover story.',{influence:20},{trust:15,coherence:8,evidence:5,autonomy:4}),
 C('compartment','Reorganize the paper trail','Delay convergence at a material and reputational cost.',{intel:25,capital:20},{coherence:-9,pattern:7,hostility:5}),
 C('wait','Wait for public corroboration','The claim itself is not a new piece of hardware.',{}, {belief:10,coherence:5})]],
 ['roe_reunion',2026,'The guests have compared notes','Roe Jogan hosts witnesses, a scientist and a technician. Independent fragments begin fitting together. The episode runs long. Very long.','840',[
 C('bridge','Use the platform for a careful bridge','No spectacle. Clear limits and a cooperative message.',{influence:24,intel:15},{trust:16,panic:-8,belief:10,coherence:8,disclosureIntent:1}),
 C('noise','One final spectacular tangent','The repeated intervention itself becomes conspicuous.',{influence:25},{coherence:-10,belief:12,noise:2,pattern:7}),
 C('silent','Remain politely unavailable','They will finish the conversation without you.',{}, {belief:10,coherence:9})]],
 ['machine_back',2029,'The machine is looking back','Mira Sol\'s analysis connects procurement records, sensor tracks and decades of anomalous activity. It does not care whether the topic is embarrassing.','392',[
 C('adapt','Diversify the Network signatures','A fundamental response, not just another story.',{intel:35,rare:8,energy:25},{pattern:-22,coherence:-5}),
 C('handshake','Offer a constrained exchange','Mutual understanding, with a cost to secrecy.',{intel:20},{trust:16,knowledge:20,humanResearch:10,flag:'ai_contact'}),
 C('dismiss','Call the result a statistical anomaly','The analysis will be repeated.',{}, {coherence:12,evidence:6,pattern:8})]],
 ['audit_web',2032,'The invoices have friends','Automated analysis connects the same unusual purchasing pattern across different continents. Legal companies are not automatically untraceable companies.','276',[
 C('reform','Rebuild the procurement web','Hire ordinary experts and accept ordinary inefficiencies.',{capital:55,intel:25},{footprint:-35,pattern:-12}),
 C('transparent','Disclose a limited technology venture','Earn legitimacy while surrendering some ambiguity.',{influence:20},{trust:12,evidence:6,dependence:8,footprint:-20}),
 C('rush','Move before the audit closes','Protect assets, but leave a trail.',{}, {capital:25,pattern:10,coherence:8})]],
 ['lunar_industry',2035,'The far side is less far away','Human prospecting missions have begun to map terrain that used to count as your quiet neighborhood.','156',[
 C('partner','Negotiate a research exclusion zone','A treaty-shaped solution to an orbital problem.',{influence:25,intel:15},{trust:15,dependence:10,knowledge:12}),
 C('relocate','Move the most visible systems','An inconvenient relocation, but no public confrontation.',{common:18,energy:35},{pattern:-12,coherence:-4}),
 C('observe','Let them see the edge of it','You cannot hide forever by doing nothing.',{}, {evidence:10,belief:10,knowledge:15})]],
 ['sovereignty_debate',2038,'They would like to remain in charge','Several officials have noticed that cooperation and dependency are not synonyms. A sovereignty proposal is circulating.','643',[
 C('respect','Offer genuine exit clauses','Less leverage, substantially less hostility.',{influence:22},{hostility:-22,trust:18,dependence:-12,autonomy:5}),
 C('bargain','Offer a better economic bargain','Useful, but it does not answer every concern.',{capital:50},{trust:10,dependence:12,hostility:-8}),
 C('pressure','Remind them who built the systems','A powerful argument against you as well as for you.',{}, {dependence:10,hostility:20,coercion:8,panic:5})]],
 ['counter_field',2041,'A human answer to your favorite trick','A laboratory reports a limited counter-field demonstration. Imperfect, local and still strategically significant.','643',[
 C('coexist','Propose mutual technical limits','Knowing you can be resisted makes cooperation more meaningful.',{intel:30,influence:20},{trust:20,hostility:-16,humanResearch:8,autonomy:3}),
 C('adapt','Redesign vulnerable systems','A technological race with no cheap finish.',{rare:15,exotic:6,energy:40},{pattern:-15,shield:1}),
 C('leverage','Demand access to the laboratory','A demand they may interpret as confirmation of their fears.',{}, {intel:20,hostility:20,coercion:5,knowledge:10})]],
 ['final_review',2044,'One century. One small planet.','The original directive remains in the archive. Your decisions have become something more complicated. There is still time to choose how this story ends.','840',[
 C('cooperation','Make cooperation the priority','A final diplomatic effort.',{influence:20},{trust:12,panic:-10,autonomy:3}),
 C('secrecy','Tighten the quiet network','Protect the hidden infrastructure.',{intel:25,energy:25},{pattern:-12,coherence:-8}),
 C('reflect','Review what the Network has learned','The humans are not merely a problem to solve.',{}, {intel:25,autonomy:5,welfare:3})]]
];
export const EVENTS=Object.fromEntries(timeline.map(([id,year,title,body,country,choices])=>[id,{id,year,title,body,country,choices,type:'history',icon:'folder'}]));
EVENTS.first_recovery.echo={title:'Something in the fishing net',body:'A fishing crew has raised an inactive Network capsule from the seabed. No modern scout was lost, but human curiosity has found an old piece of the same secret.'};
EVENTS.carrier_echo.echo={title:'The offshore calibration',body:'A naval sensor trial has registered a dormant Network beacon. No active scout was intercepted, but the recorded pattern may outlive its classification.'};
EVENTS.rob_lazer.echo={title:'The workshop rumor',body:'Rob Lazer has heard a second-hand account of an extraordinary workshop. His story draws attention, but without recovered hardware there is less to corroborate.'};
EVENTS.naval_leak.echo={title:'An archive finds the internet',body:'Old sensor reports have reached a new audience. They are less decisive than a complete encounter record, but humans are learning to compare them.'};
const add=(id,title,body,choices,icon='alert')=>{EVENTS[id]={id,title,body,choices,icon,type:'incident'};};
add('craft_lost','A scout did not come home','A field system failed over {country}. Human recovery teams are interested in the wreckage.',[
 C('retrieve','Dispatch recovery','Reclaim the physical evidence.',{energy:18,intel:10},{exotic:2,evidence:-6,knowledge:5,clearCrash:1},{requires:'recovery'}),
 C('deal','Offer an exchange','Keep the partner close, and accept a research risk.',{influence:8},{trust:15,knowledge:20,contact:2,artifact:1,clearCrash:1}),
 C('leave','Abandon the hardware','Preserve the remaining fleet. The record will persist.',{}, {evidence:7,knowledge:20,artifact:1,belief:8,clearCrash:1})]);
add('base_probe','An uninvited survey','A human investigation is approaching your installation in {country}. Your base commander has suggested becoming less interesting.',[
 C('mask','Rebuild the masking envelope','Reset the search without abandoning the installation.',{energy:25,rare:6,intel:15},{baseSearch:-70,pattern:-4}),
 C('partner','Ask a partner to reroute the survey','The classified audience grows.',{influence:15},{baseSearch:-75,knowledge:12,trust:-3},{requires:'contact'}),
 C('evacuate','Evacuate the installation','Recover part of the materials; lose the base, not the campaign.',{}, {evacuate:1,common:8,rare:3,exotic:1,evidence:4})]);
add('agent_attachment','They are not specimens','Your interface in {country} has developed deep human relationships. A directive has been politely, firmly refused.',[
 C('trust','Grant real autonomy','A more independent agent, and a better human ally.',{}, {agentAutonomy:1,autonomy:5,trust:5}),
 C('negotiate','Negotiate the assignment','Respect the relationship while preserving a useful role.',{influence:12},{agentLoyalty:15,agentAttachment:5,autonomy:2}),
 C('recall','Recall the interface','End this career without a public confrontation.',{energy:8},{agentRecall:1,bio:5,coercion:3})],'heart');
add('agent_exposure','An awkward medical appointment','Routine scrutiny has found inconsistencies in your interface\'s cover in {country}. The human administrator is asking very precise questions.',[
 C('repair','Rebuild the cover','Spend Intel and human resources to provide a coherent explanation.',{intel:18,capital:12},{agentSuspicion:-45,agentCover:12}),
 C('sponsor','Let the sponsor intervene','A powerful favor, with a diplomatic debt.',{influence:16},{agentSuspicion:-35,knowledge:8},{requires:'contact'}),
 C('recall','Withdraw the interface','A disappearing employee is better than a confirmed alien.',{}, {agentRecall:1,belief:3,evidence:3})],'agent');
add('treaty_leak','An agreement without a press office','A document describing your secret arrangement with {country} has reached an investigator.',[
 C('context','Explain the limited cooperation','Build trust at the cost of public evidence.',{influence:10},{trust:8,evidence:4,belief:5}),
 C('contain','Contain the document trail','Secure access rather than inventing more rumors.',{intel:22,capital:10},{coherence:-4,pattern:2}),
 C('deny','Deny the interpretation','The partner does not appreciate the ambiguity.',{}, {trust:-10,evidence:3,coherence:4})],'folder');
add('coalition_warning','They have started sharing radar','A Human Sovereignty Coalition is coordinating counter-detection. This is not the end of the campaign, but independent secrecy is getting more expensive.',[
 C('conciliate','Offer mutual limits','Lower hostility by giving something back.',{influence:30},{globalHostility:-12,autonomy:4,panic:-5}),
 C('defend','Harden the network','Buy time to pursue another strategic ending.',{rare:12,energy:35},{pattern:-15,shield:1}),
 C('wait','Keep your options open','Preserve resources and accept the pressure.',{}, {panic:5})],'shield');
add('disclosure','The question has changed','Independent evidence now establishes a non-human presence. Humans are no longer only asking whether you exist. They are asking what you want.',[
 C('welcome','Offer structured contact','Continue the campaign through cooperation and legitimacy.',{influence:20},{trust:18,panic:-12,open:1,autonomy:3}),
 C('quiet','Remain operationally quiet','You can be known without disclosing every asset.',{intel:20,energy:15},{pattern:-10,open:1,panic:4}),
 C('control','Demonstrate your leverage','Effective, but unmistakably coercive.',{}, {open:1,coercion:12,panic:18,globalHostility:10})],'globe');
add('blue_backfire','The staged event has receipts','Investigators have found the seams in Blue Veil. Some are now asking why a fake event needed such unusual technology.',[
 C('own','Admit the demonstration','Trust suffers less than it would under another denial.',{influence:20},{evidence:7,coherence:10,trust:-5}),
 C('repair','Separate the real trail from the staged one','A costly technical cleanup.',{intel:35,rare:8},{evidence:3,coherence:4,pattern:-5}),
 C('deny','Deny everything again','A familiar statement. An increasingly skeptical audience.',{}, {evidence:9,coherence:16,trust:-12,noise:1})],'eye');
add('final_conditions','The final project needs a signature','Construction is complete, but the strategic requirements are no longer met. The project will remain ready while you repair the situation.',[
 C('wait','Keep the project ready','No second construction cost. Restore the requirements and finalize from the Endings panel.',{}, {})],'flag');
add('shortage','A very ordinary supply problem','The Network is advanced, not infinite. Several systems have reduced their activity to preserve energy.',[
 C('reserve','Release the reserve','Recycle common material into a short-term energy buffer.',{common:8},{energy:45}),
 C('hibernate','Accept reduced activity','Power generation continues; other output resumes when reserves recover.',{}, {})],'energy');
// Repeatable incident pool. Each scenario has distinct wording and a meaningful quiet / opportunity / wait tradeoff.
const incidentRows=[
 ['birdwatcher','An unusually well-equipped birdwatcher','A local observer recorded an excellent image of something that is very clearly not a bird.',{intel:12},{evidence:-2,coherence:-2},{intel:12,belief:3,evidence:2}],
 ['maintenance','Maintenance, eventually','A field component is drifting outside safe tolerances. Advanced technology is still technology.',{common:5,rare:2},{energy:12,pattern:-2},{intel:8,pattern:3}],
 ['seismic','The cave is too symmetrical','A geological survey found a cavity with remarkably consistent internal angles.',{energy:14,rare:2},{pattern:-4},{intel:10,evidence:2,knowledge:4}],
 ['customs','Not on the shipping manifest','A logistics inspector is curious about a shipment with unusually consistent density.',{capital:10},{footprint:-12},{capital:18,footprint:8}],
 ['promotion_news','A useful vacancy','A friendly institution has a senior vacancy. Someone ordinary could fill it. So could your network.',{influence:10,intel:8},{leverage:8},{intel:12,knowledge:2}],
 ['museum','The museum display','An old fragment has been mislabeled as an industrial curiosity. A research visitor is looking closely.',{intel:14,energy:8},{exotic:1,evidence:-2},{intel:15,evidence:3,knowledge:5}],
 ['research_offer','A scientist asks nicely','A researcher requests a very small sample and an impressively long list of measurements.',{rare:3},{trust:10,intel:18,humanResearch:6},{intel:8,trust:-2}],
 ['rival_offer','An exclusive invitation','Officials in {country} would like a closer relationship. Preferably closer than the one their rivals enjoy.',{influence:12},{trust:12,dependence:6,rivalry:1},{intel:12,hostility:2}],
 ['old_tape','Somebody digitized the attic','An old witness recording has escaped a cardboard box and entered the public conversation.',{intel:14,influence:5},{coherence:-4},{belief:5,evidence:2}],
 ['storm','A convenient storm','Bad weather has made an excellent observation window. Your analysts advise against enjoying it too obviously.',{energy:12},{intel:22},{common:8,pattern:2}],
 ['school','The school project','A classroom science project has detected your relay. Its presentation includes glitter.',{influence:6},{trust:3,coherence:-3},{belief:4,intel:8}],
 ['holiday','An interface discovers holidays','Your human-facing staff have requested time off. Their argument contains the phrase work-life balance.',{capital:8},{influence:12,autonomy:2},{intel:10,coercion:1}],
 ['archive_firewall','A better filing system','An intelligence office is migrating old records into a searchable archive.',{intel:16},{insight:15,coherence:-2},{knowledge:6,coherence:3}],
 ['mineral_find','An interesting vein','A survey has located an unusually useful deposit. Extracting it quietly would take planning.',{energy:15},{precious:8,rare:6},{common:12,pattern:3}],
 ['sponsor','The sponsor wants an answer','A trusted human contact wants to know whether cooperation has limits.',{influence:8},{trust:12,autonomy:2},{dependence:6,hostility:4}],
 ['camera_club','A synchronized camera club','Several amateur observers are coordinating timestamps. Their hobby is becoming a methodology.',{intel:16,energy:8},{pattern:-6},{evidence:3,coherence:4}],
 ['lab_result','The alloy does not cooperate','A human laboratory cannot reproduce a recovered sample. It has, however, learned how to detect something similar.',{intel:20},{humanResearch:-8,knowledge:-3},{intel:14,humanResearch:6}],
 ['double_booking','A diplomatic scheduling error','Two rival liaisons have requested a private meeting on the same day, at the same facility.',{influence:10},{trust:8,hostility:-4},{intel:8,hostility:6}],
 ['cultural_show','Aliens, but make them charming','A human studio is making a very sympathetic story about extraterrestrial neighbors.',{capital:12},{trust:8,belief:5,panic:-3},{belief:3,intel:6}],
 ['inspection','The inspection invitation','Officials propose a tightly controlled inspection of a joint facility.',{intel:14,influence:6},{trust:14,knowledge:8,autonomy:2},{hostility:6,dependence:4}]
];
for(const [id,title,body,cost,quiet,opportunity] of incidentRows){add(id,title,body,[
 C('quiet','Take the careful approach','Spend resources to keep the situation manageable.',cost,quiet),
 C('opportunity','Use the opportunity','Accept the upside and its visible consequences.',{},opportunity),
 C('wait','Leave it to the humans','No expense. A little uncertainty remains.',{}, {belief:1,coherence:1})]);}
export const HISTORY=timeline.map(t=>t[0]);
export const DYNAMIC=incidentRows.map(t=>t[0]);
