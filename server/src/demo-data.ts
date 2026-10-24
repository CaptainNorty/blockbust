// A small hand-made catalog so the game is playable before you have a TMDB key.
// Vote counts and ratings are rough, written from memory; `npm run sync` replaces all of it with real data.
// title | year | director(s) | top cast | genres | studio | series | TMDB votes (thousands) | IMDb rating
export const DEMO = `
Following|1998|Christopher Nolan|Jeremy Theobald;Alex Haw;Lucy Russell|Crime;Thriller|Syncopy||1.3|7.5
Memento|2000|Christopher Nolan|Guy Pearce;Carrie-Anne Moss;Joe Pantoliano|Mystery;Thriller|Summit Entertainment||10|8.4
Insomnia|2002|Christopher Nolan|Al Pacino;Robin Williams;Hilary Swank|Crime;Thriller|Warner Bros. Pictures||3.6|7.2
Batman Begins|2005|Christopher Nolan|Christian Bale;Michael Caine;Liam Neeson;Katie Holmes;Gary Oldman;Cillian Murphy;Morgan Freeman|Action;Crime|Warner Bros. Pictures|The Dark Knight Collection|21|8.2
The Prestige|2006|Christopher Nolan|Hugh Jackman;Christian Bale;Michael Caine;Scarlett Johansson;Rebecca Hall;David Bowie|Drama;Mystery;Thriller|Warner Bros. Pictures||16|8.5
The Dark Knight|2008|Christopher Nolan|Christian Bale;Heath Ledger;Aaron Eckhart;Michael Caine;Maggie Gyllenhaal;Gary Oldman;Morgan Freeman|Action;Crime;Drama|Warner Bros. Pictures|The Dark Knight Collection|33|9.0
Inception|2010|Christopher Nolan|Leonardo DiCaprio;Joseph Gordon-Levitt;Elliot Page;Tom Hardy;Ken Watanabe;Cillian Murphy;Marion Cotillard;Michael Caine|Action;Science Fiction;Adventure|Warner Bros. Pictures||37|8.8
The Dark Knight Rises|2012|Christopher Nolan|Christian Bale;Tom Hardy;Anne Hathaway;Gary Oldman;Joseph Gordon-Levitt;Marion Cotillard;Michael Caine;Morgan Freeman|Action;Crime;Drama|Warner Bros. Pictures|The Dark Knight Collection|23|8.4
Interstellar|2014|Christopher Nolan|Matthew McConaughey;Anne Hathaway;Jessica Chastain;Michael Caine;Matt Damon;Casey Affleck|Adventure;Drama;Science Fiction|Paramount Pictures||36|8.7
Dunkirk|2017|Christopher Nolan|Fionn Whitehead;Tom Hardy;Mark Rylance;Kenneth Branagh;Cillian Murphy;Harry Styles|War;Drama;History|Warner Bros. Pictures||17|7.8
Tenet|2020|Christopher Nolan|John David Washington;Robert Pattinson;Elizabeth Debicki;Kenneth Branagh;Michael Caine|Action;Thriller;Science Fiction|Warner Bros. Pictures||10|7.3
Oppenheimer|2023|Christopher Nolan|Cillian Murphy;Emily Blunt;Matt Damon;Robert Downey Jr.;Florence Pugh;Josh Hartnett;Casey Affleck;Rami Malek|Drama;History|Universal Pictures||10|8.3
Reservoir Dogs|1992|Quentin Tarantino|Harvey Keitel;Tim Roth;Michael Madsen;Steve Buscemi;Chris Penn;Quentin Tarantino|Crime;Thriller|Miramax||14|8.3
Pulp Fiction|1994|Quentin Tarantino|John Travolta;Samuel L. Jackson;Uma Thurman;Bruce Willis;Ving Rhames;Harvey Keitel;Tim Roth;Christopher Walken|Thriller;Crime|Miramax||28|8.9
Jackie Brown|1997|Quentin Tarantino|Pam Grier;Samuel L. Jackson;Robert Forster;Bridget Fonda;Michael Keaton;Robert De Niro|Crime;Drama;Thriller|Miramax||6.3|7.5
Kill Bill: Vol. 1|2003|Quentin Tarantino|Uma Thurman;Lucy Liu;Vivica A. Fox;Daryl Hannah;David Carradine;Michael Madsen|Action;Crime|Miramax|Kill Bill Collection|17|8.2
Kill Bill: Vol. 2|2004|Quentin Tarantino|Uma Thurman;David Carradine;Michael Madsen;Daryl Hannah;Samuel L. Jackson|Action;Crime|Miramax|Kill Bill Collection|12|8.0
Death Proof|2007|Quentin Tarantino|Kurt Russell;Rosario Dawson;Zoë Bell;Mary Elizabeth Winstead;Vanessa Ferlito|Action;Thriller;Horror|Dimension Films||5|7.0
Inglourious Basterds|2009|Quentin Tarantino|Brad Pitt;Christoph Waltz;Mélanie Laurent;Michael Fassbender;Diane Kruger;Eli Roth|Drama;Action;War|The Weinstein Company||22|8.4
Django Unchained|2012|Quentin Tarantino|Jamie Foxx;Christoph Waltz;Leonardo DiCaprio;Kerry Washington;Samuel L. Jackson;Walton Goggins|Drama;Western|Columbia Pictures||26|8.5
The Hateful Eight|2015|Quentin Tarantino|Samuel L. Jackson;Kurt Russell;Jennifer Jason Leigh;Walton Goggins;Tim Roth;Michael Madsen;Bruce Dern;Channing Tatum|Drama;Mystery;Western|The Weinstein Company||14|7.8
Once Upon a Time... in Hollywood|2019|Quentin Tarantino|Leonardo DiCaprio;Brad Pitt;Margot Robbie;Emile Hirsch;Margaret Qualley;Timothy Olyphant;Al Pacino|Comedy;Drama;Thriller|Columbia Pictures||13|7.6
Hard Eight|1996|Paul Thomas Anderson|Philip Baker Hall;John C. Reilly;Gwyneth Paltrow;Samuel L. Jackson;Philip Seymour Hoffman|Crime;Drama|Rysher Entertainment||0.6|7.1
Boogie Nights|1997|Paul Thomas Anderson|Mark Wahlberg;Burt Reynolds;Julianne Moore;John C. Reilly;Heather Graham;Philip Seymour Hoffman;Don Cheadle;William H. Macy|Drama|New Line Cinema||3.3|7.9
Magnolia|1999|Paul Thomas Anderson|Tom Cruise;Julianne Moore;Philip Seymour Hoffman;John C. Reilly;William H. Macy;Philip Baker Hall;Jason Robards|Drama|New Line Cinema||3.6|8.0
Punch-Drunk Love|2002|Paul Thomas Anderson|Adam Sandler;Emily Watson;Philip Seymour Hoffman;Luis Guzmán|Comedy;Drama;Romance|Columbia Pictures||2|7.3
There Will Be Blood|2007|Paul Thomas Anderson|Daniel Day-Lewis;Paul Dano;Kevin J. O'Connor;Ciarán Hinds|Drama|Paramount Vantage||6.5|8.2
The Master|2012|Paul Thomas Anderson|Joaquin Phoenix;Philip Seymour Hoffman;Amy Adams;Laura Dern;Jesse Plemons|Drama|The Weinstein Company||2.9|7.1
Inherent Vice|2014|Paul Thomas Anderson|Joaquin Phoenix;Josh Brolin;Owen Wilson;Katherine Waterston;Reese Witherspoon;Benicio del Toro|Crime;Comedy;Mystery|Warner Bros. Pictures||2.2|6.6
Phantom Thread|2017|Paul Thomas Anderson|Daniel Day-Lewis;Vicky Krieps;Lesley Manville|Drama;Romance|Focus Features||3.6|7.4
Licorice Pizza|2021|Paul Thomas Anderson|Alana Haim;Cooper Hoffman;Sean Penn;Bradley Cooper;Benny Safdie|Comedy;Drama;Romance|Metro-Goldwyn-Mayer||1.6|7.1
Jaws|1975|Steven Spielberg|Roy Scheider;Robert Shaw;Richard Dreyfuss;Lorraine Gary|Horror;Thriller;Adventure|Universal Pictures||10|8.1
Close Encounters of the Third Kind|1977|Steven Spielberg|Richard Dreyfuss;François Truffaut;Teri Garr;Melinda Dillon|Science Fiction;Drama|Columbia Pictures||4|7.6
Raiders of the Lost Ark|1981|Steven Spielberg|Harrison Ford;Karen Allen;Paul Freeman;John Rhys-Davies;Denholm Elliott|Adventure;Action|Paramount Pictures|Indiana Jones Collection|12|8.4
E.T. the Extra-Terrestrial|1982|Steven Spielberg|Henry Thomas;Drew Barrymore;Dee Wallace;Peter Coyote|Science Fiction;Adventure;Family|Universal Pictures||11|7.9
Indiana Jones and the Temple of Doom|1984|Steven Spielberg|Harrison Ford;Kate Capshaw;Ke Huy Quan;Amrish Puri|Adventure;Action|Paramount Pictures|Indiana Jones Collection|8.5|7.5
Indiana Jones and the Last Crusade|1989|Steven Spielberg|Harrison Ford;Sean Connery;Alison Doody;Denholm Elliott;John Rhys-Davies;River Phoenix|Adventure;Action|Paramount Pictures|Indiana Jones Collection|9.5|8.2
Jurassic Park|1993|Steven Spielberg|Sam Neill;Laura Dern;Jeff Goldblum;Richard Attenborough;Samuel L. Jackson;Wayne Knight|Adventure;Science Fiction|Universal Pictures|Jurassic Park Collection|16|8.2
Schindler's List|1993|Steven Spielberg|Liam Neeson;Ben Kingsley;Ralph Fiennes;Caroline Goodall|Drama;History;War|Universal Pictures||16|9.0
Saving Private Ryan|1998|Steven Spielberg|Tom Hanks;Matt Damon;Tom Sizemore;Edward Burns;Barry Pepper;Adam Goldberg;Vin Diesel;Giovanni Ribisi|Drama;History;War|DreamWorks Pictures||16|8.6
Catch Me If You Can|2002|Steven Spielberg|Leonardo DiCaprio;Tom Hanks;Christopher Walken;Martin Sheen;Amy Adams|Drama;Crime|DreamWorks Pictures||15|8.1
Minority Report|2002|Steven Spielberg|Tom Cruise;Colin Farrell;Samantha Morton;Max von Sydow|Science Fiction;Action;Thriller|20th Century Fox||8.5|7.6
The Terminal|2004|Steven Spielberg|Tom Hanks;Catherine Zeta-Jones;Stanley Tucci;Chi McBride|Comedy;Drama|DreamWorks Pictures||7.5|7.4
Indiana Jones and the Kingdom of the Crystal Skull|2008|Steven Spielberg|Harrison Ford;Cate Blanchett;Shia LaBeouf;Karen Allen;Ray Winstone|Adventure;Action|Paramount Pictures|Indiana Jones Collection|7|6.2
Lincoln|2012|Steven Spielberg|Daniel Day-Lewis;Sally Field;Tommy Lee Jones;Joseph Gordon-Levitt;David Strathairn|Drama;History|DreamWorks Pictures||4.5|7.3
Bridge of Spies|2015|Steven Spielberg|Tom Hanks;Mark Rylance;Amy Ryan;Alan Alda|Drama;Thriller;History|DreamWorks Pictures||6|7.6
Taxi Driver|1976|Martin Scorsese|Robert De Niro;Jodie Foster;Cybill Shepherd;Harvey Keitel|Crime;Drama|Columbia Pictures||12|8.2
Raging Bull|1980|Martin Scorsese|Robert De Niro;Cathy Moriarty;Joe Pesci|Drama|United Artists||4.3|8.1
Goodfellas|1990|Martin Scorsese|Robert De Niro;Ray Liotta;Joe Pesci;Lorraine Bracco;Paul Sorvino|Drama;Crime|Warner Bros. Pictures||13|8.7
Casino|1995|Martin Scorsese|Robert De Niro;Sharon Stone;Joe Pesci;James Woods|Crime;Drama|Universal Pictures||6.3|8.2
Gangs of New York|2002|Martin Scorsese|Leonardo DiCaprio;Daniel Day-Lewis;Cameron Diaz;Jim Broadbent;Liam Neeson|Drama;History;Crime|Miramax||6|7.5
The Aviator|2004|Martin Scorsese|Leonardo DiCaprio;Cate Blanchett;Kate Beckinsale;John C. Reilly;Alec Baldwin|Drama|Miramax||6|7.5
The Departed|2006|Martin Scorsese|Leonardo DiCaprio;Matt Damon;Jack Nicholson;Mark Wahlberg;Martin Sheen;Vera Farmiga;Alec Baldwin|Drama;Thriller;Crime|Warner Bros. Pictures||15|8.5
Shutter Island|2010|Martin Scorsese|Leonardo DiCaprio;Mark Ruffalo;Ben Kingsley;Michelle Williams;Emily Mortimer|Drama;Thriller;Mystery|Paramount Pictures||24|8.2
Hugo|2011|Martin Scorsese|Asa Butterfield;Chloë Grace Moretz;Ben Kingsley;Sacha Baron Cohen|Adventure;Drama;Family|Paramount Pictures||6|7.5
The Wolf of Wall Street|2013|Martin Scorsese|Leonardo DiCaprio;Jonah Hill;Margot Robbie;Matthew McConaughey;Kyle Chandler;Jon Bernthal|Crime;Drama;Comedy|Paramount Pictures||24|8.2
The Irishman|2019|Martin Scorsese|Robert De Niro;Al Pacino;Joe Pesci;Harvey Keitel;Anna Paquin|Crime;Drama;History|Netflix||7|7.8
Killers of the Flower Moon|2023|Martin Scorsese|Leonardo DiCaprio;Robert De Niro;Lily Gladstone;Jesse Plemons;Brendan Fraser|Crime;Drama;History|Apple Studios||3|7.6
Se7en|1995|David Fincher|Brad Pitt;Morgan Freeman;Gwyneth Paltrow;Kevin Spacey;R. Lee Ermey|Crime;Mystery;Thriller|New Line Cinema||21|8.6
The Game|1997|David Fincher|Michael Douglas;Sean Penn;Deborah Kara Unger|Drama;Thriller;Mystery|PolyGram Filmed Entertainment||5|7.7
Fight Club|1999|David Fincher|Brad Pitt;Edward Norton;Helena Bonham Carter;Meat Loaf;Jared Leto|Drama;Thriller|20th Century Fox||30|8.8
Panic Room|2002|David Fincher|Jodie Foster;Kristen Stewart;Forest Whitaker;Jared Leto;Dwight Yoakam|Crime;Thriller|Columbia Pictures||5|6.8
Zodiac|2007|David Fincher|Jake Gyllenhaal;Mark Ruffalo;Robert Downey Jr.;Anthony Edwards;Brian Cox|Crime;Drama;Mystery|Paramount Pictures||11|7.7
The Social Network|2010|David Fincher|Jesse Eisenberg;Andrew Garfield;Justin Timberlake;Armie Hammer;Rooney Mara|Drama|Columbia Pictures||12|7.8
The Girl with the Dragon Tattoo|2011|David Fincher|Daniel Craig;Rooney Mara;Christopher Plummer;Stellan Skarsgård;Robin Wright|Thriller;Crime;Mystery|Columbia Pictures||9|7.8
Gone Girl|2014|David Fincher|Ben Affleck;Rosamund Pike;Neil Patrick Harris;Tyler Perry;Carrie Coon|Mystery;Thriller;Drama|20th Century Fox||19|8.1
Bottle Rocket|1996|Wes Anderson|Luke Wilson;Owen Wilson;Robert Musgrave;Lumi Cavazos;James Caan|Comedy;Crime|Columbia Pictures||0.8|6.9
Rushmore|1998|Wes Anderson|Jason Schwartzman;Bill Murray;Olivia Williams;Seymour Cassel;Luke Wilson|Comedy;Drama|Touchstone Pictures||2.5|7.6
The Royal Tenenbaums|2001|Wes Anderson|Gene Hackman;Anjelica Huston;Ben Stiller;Gwyneth Paltrow;Luke Wilson;Owen Wilson;Bill Murray;Danny Glover|Comedy;Drama|Touchstone Pictures||4.6|7.6
The Life Aquatic with Steve Zissou|2004|Wes Anderson|Bill Murray;Owen Wilson;Cate Blanchett;Anjelica Huston;Willem Dafoe;Jeff Goldblum|Adventure;Comedy;Drama|Touchstone Pictures||3|7.2
The Darjeeling Limited|2007|Wes Anderson|Owen Wilson;Adrien Brody;Jason Schwartzman;Anjelica Huston;Bill Murray|Adventure;Comedy;Drama|Fox Searchlight Pictures||2.6|7.2
Fantastic Mr. Fox|2009|Wes Anderson|George Clooney;Meryl Streep;Jason Schwartzman;Bill Murray;Willem Dafoe;Owen Wilson|Animation;Comedy;Family|20th Century Fox||5.3|7.9
Moonrise Kingdom|2012|Wes Anderson|Jared Gilman;Kara Hayward;Bruce Willis;Edward Norton;Bill Murray;Frances McDormand;Tilda Swinton;Jason Schwartzman|Comedy;Drama;Romance|Focus Features||6.5|7.8
The Grand Budapest Hotel|2014|Wes Anderson|Ralph Fiennes;Tony Revolori;F. Murray Abraham;Adrien Brody;Willem Dafoe;Jeff Goldblum;Edward Norton;Saoirse Ronan|Comedy;Drama|Fox Searchlight Pictures||15|8.1
Isle of Dogs|2018|Wes Anderson|Bryan Cranston;Koyu Rankin;Edward Norton;Bob Balaban;Bill Murray;Jeff Goldblum;Scarlett Johansson|Animation;Comedy;Adventure|Fox Searchlight Pictures||3.6|7.8
The French Dispatch|2021|Wes Anderson|Benicio del Toro;Adrien Brody;Tilda Swinton;Léa Seydoux;Frances McDormand;Timothée Chalamet;Bill Murray;Owen Wilson|Comedy;Drama;Romance|Searchlight Pictures||2|7.1
Asteroid City|2023|Wes Anderson|Jason Schwartzman;Scarlett Johansson;Tom Hanks;Jeffrey Wright;Tilda Swinton;Edward Norton;Adrien Brody|Comedy;Drama;Romance|Focus Features||1.3|6.4
Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb|1964|Stanley Kubrick|Peter Sellers;George C. Scott;Sterling Hayden;Slim Pickens|Comedy;War|Columbia Pictures||5|8.4
2001: A Space Odyssey|1968|Stanley Kubrick|Keir Dullea;Gary Lockwood;William Sylvester;Douglas Rain|Science Fiction;Mystery;Adventure|Metro-Goldwyn-Mayer||11|8.3
A Clockwork Orange|1971|Stanley Kubrick|Malcolm McDowell;Patrick Magee;Michael Bates;Warren Clarke|Science Fiction;Crime|Warner Bros. Pictures||13|8.2
Barry Lyndon|1975|Stanley Kubrick|Ryan O'Neal;Marisa Berenson;Patrick Magee;Hardy Krüger|Drama;Romance;War|Warner Bros. Pictures||3|8.1
The Shining|1980|Stanley Kubrick|Jack Nicholson;Shelley Duvall;Danny Lloyd;Scatman Crothers|Horror;Thriller|Warner Bros. Pictures||17|8.4
Full Metal Jacket|1987|Stanley Kubrick|Matthew Modine;Vincent D'Onofrio;R. Lee Ermey;Adam Baldwin|Drama;War|Warner Bros. Pictures||10|8.3
Eyes Wide Shut|1999|Stanley Kubrick|Tom Cruise;Nicole Kidman;Sydney Pollack;Todd Field|Drama;Mystery;Thriller|Warner Bros. Pictures||6|7.5
Star Wars|1977|George Lucas|Mark Hamill;Harrison Ford;Carrie Fisher;Peter Cushing;Alec Guinness;Anthony Daniels|Adventure;Action;Science Fiction|Lucasfilm Ltd.|Star Wars Collection|20|8.6
The Empire Strikes Back|1980|Irvin Kershner|Mark Hamill;Harrison Ford;Carrie Fisher;Billy Dee Williams;Anthony Daniels;Frank Oz|Adventure;Action;Science Fiction|Lucasfilm Ltd.|Star Wars Collection|17|8.7
Return of the Jedi|1983|Richard Marquand|Mark Hamill;Harrison Ford;Carrie Fisher;Billy Dee Williams;Anthony Daniels;Ian McDiarmid|Adventure;Action;Science Fiction|Lucasfilm Ltd.|Star Wars Collection|15|8.3
Star Wars: Episode I - The Phantom Menace|1999|George Lucas|Liam Neeson;Ewan McGregor;Natalie Portman;Jake Lloyd;Ian McDiarmid;Samuel L. Jackson|Adventure;Action;Science Fiction|Lucasfilm Ltd.|Star Wars Collection|14|6.5
Star Wars: Episode II - Attack of the Clones|2002|George Lucas|Ewan McGregor;Natalie Portman;Hayden Christensen;Ian McDiarmid;Samuel L. Jackson;Christopher Lee|Adventure;Action;Science Fiction|Lucasfilm Ltd.|Star Wars Collection|13|6.6
Star Wars: Episode III - Revenge of the Sith|2005|George Lucas|Ewan McGregor;Natalie Portman;Hayden Christensen;Ian McDiarmid;Samuel L. Jackson;Christopher Lee|Adventure;Action;Science Fiction|Lucasfilm Ltd.|Star Wars Collection|14|7.6
The Lord of the Rings: The Fellowship of the Ring|2001|Peter Jackson|Elijah Wood;Ian McKellen;Viggo Mortensen;Sean Astin;Orlando Bloom;Cate Blanchett;Sean Bean;Liv Tyler|Adventure;Fantasy;Action|New Line Cinema|The Lord of the Rings Collection|26|8.9
The Lord of the Rings: The Two Towers|2002|Peter Jackson|Elijah Wood;Ian McKellen;Viggo Mortensen;Sean Astin;Orlando Bloom;Andy Serkis;Liv Tyler;Miranda Otto|Adventure;Fantasy;Action|New Line Cinema|The Lord of the Rings Collection|22|8.8
The Lord of the Rings: The Return of the King|2003|Peter Jackson|Elijah Wood;Ian McKellen;Viggo Mortensen;Sean Astin;Orlando Bloom;Andy Serkis;Liv Tyler;Cate Blanchett|Adventure;Fantasy;Action|New Line Cinema|The Lord of the Rings Collection|25|9.0
Back to the Future|1985|Robert Zemeckis|Michael J. Fox;Christopher Lloyd;Lea Thompson;Crispin Glover;Thomas F. Wilson|Adventure;Comedy;Science Fiction|Universal Pictures|Back to the Future Collection|20|8.5
Back to the Future Part II|1989|Robert Zemeckis|Michael J. Fox;Christopher Lloyd;Lea Thompson;Thomas F. Wilson;Elisabeth Shue|Adventure;Comedy;Science Fiction|Universal Pictures|Back to the Future Collection|13|7.8
Back to the Future Part III|1990|Robert Zemeckis|Michael J. Fox;Christopher Lloyd;Mary Steenburgen;Thomas F. Wilson;Lea Thompson|Adventure;Comedy;Science Fiction;Western|Universal Pictures|Back to the Future Collection|11|7.5
Forrest Gump|1994|Robert Zemeckis|Tom Hanks;Robin Wright;Gary Sinise;Sally Field;Mykelti Williamson|Comedy;Drama;Romance|Paramount Pictures||27|8.8
Cast Away|2000|Robert Zemeckis|Tom Hanks;Helen Hunt;Nick Searcy;Chris Noth|Adventure;Drama|20th Century Fox||11|7.8
Toy Story|1995|John Lasseter|Tom Hanks;Tim Allen;Don Rickles;Jim Varney;Wallace Shawn;John Ratzenberger|Animation;Adventure;Family;Comedy|Pixar|Toy Story Collection|18|8.3
Toy Story 2|1999|John Lasseter|Tom Hanks;Tim Allen;Joan Cusack;Kelsey Grammer;Don Rickles|Animation;Comedy;Family|Pixar|Toy Story Collection|14|7.9
Toy Story 3|2010|Lee Unkrich|Tom Hanks;Tim Allen;Joan Cusack;Ned Beatty;Don Rickles;Michael Keaton|Animation;Family;Comedy|Pixar|Toy Story Collection|15|8.3
Toy Story 4|2019|Josh Cooley|Tom Hanks;Tim Allen;Annie Potts;Tony Hale;Keanu Reeves;Christina Hendricks|Animation;Family;Adventure;Comedy|Pixar|Toy Story Collection|9|7.7
The Matrix|1999|Lana Wachowski;Lilly Wachowski|Keanu Reeves;Laurence Fishburne;Carrie-Anne Moss;Hugo Weaving;Joe Pantoliano|Action;Science Fiction|Warner Bros. Pictures|The Matrix Collection|25|8.7
The Matrix Reloaded|2003|Lana Wachowski;Lilly Wachowski|Keanu Reeves;Laurence Fishburne;Carrie-Anne Moss;Hugo Weaving;Jada Pinkett Smith;Monica Bellucci|Action;Science Fiction|Warner Bros. Pictures|The Matrix Collection|11|7.2
The Matrix Revolutions|2003|Lana Wachowski;Lilly Wachowski|Keanu Reeves;Laurence Fishburne;Carrie-Anne Moss;Hugo Weaving;Jada Pinkett Smith|Action;Science Fiction|Warner Bros. Pictures|The Matrix Collection|9.5|6.7
John Wick|2014|Chad Stahelski|Keanu Reeves;Michael Nyqvist;Alfie Allen;Willem Dafoe;Ian McShane;Adrianne Palicki|Action;Thriller|Lionsgate|John Wick Collection|19|7.4
Speed|1994|Jan de Bont|Keanu Reeves;Sandra Bullock;Dennis Hopper;Jeff Daniels;Joe Morton|Action;Thriller;Crime|20th Century Fox||5.5|7.3
Point Break|1991|Kathryn Bigelow|Keanu Reeves;Patrick Swayze;Gary Busey;Lori Petty|Action;Crime;Thriller|20th Century Fox||3.4|7.3
Jackie Chan's Who Am I?|1998|Benny Chan;Jackie Chan|Jackie Chan;Michelle Ferre;Mirai Yamamoto|Action;Adventure|Golden Harvest||0.4|6.7
Die Hard|1988|John McTiernan|Bruce Willis;Alan Rickman;Bonnie Bedelia;Reginald VelJohnson;Alexander Godunov|Action;Thriller|20th Century Fox|Die Hard Collection|11|8.2
Die Hard with a Vengeance|1995|John McTiernan|Bruce Willis;Samuel L. Jackson;Jeremy Irons;Graham Greene|Action;Thriller|20th Century Fox|Die Hard Collection|6.5|7.6
Unbreakable|2000|M. Night Shyamalan|Bruce Willis;Samuel L. Jackson;Robin Wright;Spencer Treat Clark|Thriller;Drama;Mystery|Touchstone Pictures||9|7.3
The Sixth Sense|1999|M. Night Shyamalan|Bruce Willis;Haley Joel Osment;Toni Collette;Olivia Williams|Mystery;Thriller;Drama|Hollywood Pictures||12|8.2
Snakes on a Plane|2006|David R. Ellis|Samuel L. Jackson;Julianna Margulies;Nathan Phillips;Rachel Blanchard|Action;Thriller;Horror|New Line Cinema||2.8|5.6
The Avengers|2012|Joss Whedon|Robert Downey Jr.;Chris Evans;Mark Ruffalo;Chris Hemsworth;Scarlett Johansson;Jeremy Renner;Tom Hiddleston;Samuel L. Jackson|Science Fiction;Action;Adventure|Marvel Studios|The Avengers Collection|31|8.0
Iron Man|2008|Jon Favreau|Robert Downey Jr.;Terrence Howard;Jeff Bridges;Gwyneth Paltrow;Shaun Toub|Action;Science Fiction;Adventure|Marvel Studios|Iron Man Collection|26|7.9
Captain Marvel|2019|Anna Boden;Ryan Fleck|Brie Larson;Samuel L. Jackson;Ben Mendelsohn;Jude Law;Annette Bening|Action;Adventure;Science Fiction|Marvel Studios||15|6.8
Glass|2019|M. Night Shyamalan|James McAvoy;Bruce Willis;Samuel L. Jackson;Anya Taylor-Joy;Sarah Paulson|Thriller;Drama;Science Fiction|Universal Pictures||8|6.6
Good Will Hunting|1997|Gus Van Sant|Robin Williams;Matt Damon;Ben Affleck;Stellan Skarsgård;Minnie Driver|Drama|Miramax||12|8.3
The Bourne Identity|2002|Doug Liman|Matt Damon;Franka Potente;Chris Cooper;Clive Owen;Brian Cox|Action;Drama;Mystery;Thriller|Universal Pictures|The Bourne Collection|9|7.9
The Martian|2015|Ridley Scott|Matt Damon;Jessica Chastain;Kristen Wiig;Jeff Daniels;Michael Peña;Sean Bean;Chiwetel Ejiofor|Drama;Adventure;Science Fiction|20th Century Fox||20|8.0
Alien|1979|Ridley Scott|Sigourney Weaver;Tom Skerritt;Veronica Cartwright;Harry Dean Stanton;John Hurt;Ian Holm|Horror;Science Fiction|20th Century Fox|Alien Collection|15|8.5
Blade Runner|1982|Ridley Scott|Harrison Ford;Rutger Hauer;Sean Young;Edward James Olmos;Daryl Hannah|Science Fiction;Drama;Thriller|Warner Bros. Pictures|Blade Runner Collection|14|8.1
Gladiator|2000|Ridley Scott|Russell Crowe;Joaquin Phoenix;Connie Nielsen;Oliver Reed;Richard Harris|Action;Drama;Adventure|DreamWorks Pictures||19|8.5
Thelma & Louise|1991|Ridley Scott|Susan Sarandon;Geena Davis;Harvey Keitel;Michael Madsen;Brad Pitt|Drama;Crime;Adventure|Metro-Goldwyn-Mayer||3.5|7.5
Joker|2019|Todd Phillips|Joaquin Phoenix;Robert De Niro;Zazie Beetz;Frances Conroy|Crime;Thriller;Drama|Warner Bros. Pictures||25|8.4
Her|2013|Spike Jonze|Joaquin Phoenix;Scarlett Johansson;Amy Adams;Rooney Mara;Olivia Wilde|Romance;Science Fiction;Drama|Annapurna Pictures||14|8.0
Lost in Translation|2003|Sofia Coppola|Bill Murray;Scarlett Johansson;Giovanni Ribisi;Anna Faris|Drama;Comedy;Romance|Focus Features||7.5|7.7
Ghostbusters|1984|Ivan Reitman|Bill Murray;Dan Aykroyd;Sigourney Weaver;Harold Ramis;Rick Moranis;Ernie Hudson|Comedy;Fantasy|Columbia Pictures|Ghostbusters Collection|8|7.8
Groundhog Day|1993|Harold Ramis|Bill Murray;Andie MacDowell;Chris Elliott;Stephen Tobolowsky|Romance;Fantasy;Drama;Comedy|Columbia Pictures||7|8.0
Zombieland|2009|Ruben Fleischer|Woody Harrelson;Jesse Eisenberg;Emma Stone;Abigail Breslin;Bill Murray|Action;Comedy;Horror|Columbia Pictures||11|7.5
Get Out|2017|Jordan Peele|Daniel Kaluuya;Allison Williams;Bradley Whitford;Catherine Keener;LaKeith Stanfield|Mystery;Thriller;Horror|Universal Pictures||16|7.8
Us|2019|Jordan Peele|Lupita Nyong'o;Winston Duke;Elisabeth Moss;Shahadi Wright Joseph|Horror;Thriller;Mystery|Universal Pictures||8|6.8
Nope|2022|Jordan Peele|Daniel Kaluuya;Keke Palmer;Steven Yeun;Brandon Perea;Michael Wincott|Horror;Science Fiction;Mystery|Universal Pictures||5|6.8
Parasite|2019|Bong Joon-ho|Song Kang-ho;Lee Sun-kyun;Cho Yeo-jeong;Choi Woo-shik;Park So-dam|Comedy;Thriller;Drama|CJ Entertainment||18|8.5
Everything Everywhere All at Once|2022|Daniel Kwan;Daniel Scheinert|Michelle Yeoh;Ke Huy Quan;Stephanie Hsu;Jamie Lee Curtis;James Hong|Action;Adventure;Science Fiction|A24||7|7.8
Moonlight|2016|Barry Jenkins|Trevante Rhodes;Ashton Sanders;Alex R. Hibbert;Mahershala Ali;Naomie Harris;Janelle Monáe|Drama|A24||7|7.4
Hereditary|2018|Ari Aster|Toni Collette;Alex Wolff;Milly Shapiro;Gabriel Byrne;Ann Dowd|Horror;Mystery;Thriller|A24||8|7.3
Midsommar|2019|Ari Aster|Florence Pugh;Jack Reynor;William Jackson Harper;Will Poulter|Horror;Drama;Mystery|A24||8|7.1
Uncut Gems|2019|Benny Safdie;Josh Safdie|Adam Sandler;Julia Fox;Kevin Garnett;Idina Menzel;LaKeith Stanfield|Crime;Drama;Thriller|A24||5|7.4
Lady Bird|2017|Greta Gerwig|Saoirse Ronan;Laurie Metcalf;Tracy Letts;Lucas Hedges;Timothée Chalamet|Comedy;Drama|A24||9|7.4
Ex Machina|2015|Alex Garland|Domhnall Gleeson;Alicia Vikander;Oscar Isaac;Sonoya Mizuno|Drama;Science Fiction|A24||13|7.7
The Witch|2015|Robert Eggers|Anya Taylor-Joy;Ralph Ineson;Kate Dickie;Harvey Scrimshaw|Horror;Drama;Fantasy|A24||6|6.9
The Lighthouse|2019|Robert Eggers|Robert Pattinson;Willem Dafoe;Valeriia Karaman|Drama;Fantasy;Horror|A24||5|7.4
Barbie|2023|Greta Gerwig|Margot Robbie;Ryan Gosling;America Ferrera;Kate McKinnon;Issa Rae;Michael Cera|Comedy;Adventure|Warner Bros. Pictures||9|6.8
Little Women|2019|Greta Gerwig|Saoirse Ronan;Emma Watson;Florence Pugh;Eliza Scanlen;Laura Dern;Timothée Chalamet;Meryl Streep|Drama;Romance|Columbia Pictures||7|7.8
Dune|2021|Denis Villeneuve|Timothée Chalamet;Rebecca Ferguson;Oscar Isaac;Jason Momoa;Stellan Skarsgård;Josh Brolin;Zendaya|Science Fiction;Adventure|Legendary Pictures|Dune Collection|13|8.0
Dune|1984|David Lynch|Kyle MacLachlan;Francesca Annis;Jürgen Prochnow;Sean Young;Patrick Stewart;Sting|Action;Science Fiction;Adventure|Universal Pictures||2.8|6.3
Dune: Part Two|2024|Denis Villeneuve|Timothée Chalamet;Zendaya;Rebecca Ferguson;Javier Bardem;Josh Brolin;Austin Butler;Florence Pugh|Science Fiction;Adventure|Legendary Pictures|Dune Collection|7|8.5
Arrival|2016|Denis Villeneuve|Amy Adams;Jeremy Renner;Forest Whitaker;Michael Stuhlbarg|Drama;Science Fiction;Mystery|Paramount Pictures||18|7.9
Blade Runner 2049|2017|Denis Villeneuve|Ryan Gosling;Harrison Ford;Ana de Armas;Sylvia Hoeks;Robin Wright;Jared Leto|Science Fiction;Drama|Warner Bros. Pictures|Blade Runner Collection|14|8.0
Prisoners|2013|Denis Villeneuve|Hugh Jackman;Jake Gyllenhaal;Viola Davis;Maria Bello;Terrence Howard;Paul Dano|Drama;Thriller;Crime|Warner Bros. Pictures||11|8.1
Sicario|2015|Denis Villeneuve|Emily Blunt;Benicio del Toro;Josh Brolin;Daniel Kaluuya;Jon Bernthal|Action;Crime;Thriller|Lionsgate||9|7.6
Nightcrawler|2014|Dan Gilroy|Jake Gyllenhaal;Rene Russo;Riz Ahmed;Bill Paxton|Crime;Drama;Thriller|Open Road Films||10|7.8
Donnie Darko|2001|Richard Kelly|Jake Gyllenhaal;Jena Malone;Mary McDonnell;Maggie Gyllenhaal;Patrick Swayze;Drew Barrymore|Fantasy;Drama;Mystery|Newmarket Films||11|8.0
Brokeback Mountain|2005|Ang Lee|Heath Ledger;Jake Gyllenhaal;Michelle Williams;Anne Hathaway;Randy Quaid|Drama;Romance|Focus Features||6.5|7.7
La La Land|2016|Damien Chazelle|Ryan Gosling;Emma Stone;John Legend;Rosemarie DeWitt;J.K. Simmons|Comedy;Drama;Romance;Music|Lionsgate||17|8.0
Whiplash|2014|Damien Chazelle|Miles Teller;J.K. Simmons;Melissa Benoist;Paul Reiser|Drama;Music|Sony Pictures Classics||15|8.5
Drive|2011|Nicolas Winding Refn|Ryan Gosling;Carey Mulligan;Bryan Cranston;Albert Brooks;Oscar Isaac;Ron Perlman|Drama;Thriller;Crime|FilmDistrict||12|7.8
Crazy, Stupid, Love.|2011|Glenn Ficarra;John Requa|Steve Carell;Ryan Gosling;Julianne Moore;Emma Stone;Marisa Tomei|Comedy;Drama;Romance|Warner Bros. Pictures||10|7.4
The Big Short|2015|Adam McKay|Christian Bale;Steve Carell;Ryan Gosling;Brad Pitt;Marisa Tomei|Comedy;Drama;History|Paramount Pictures||9|7.8
American Psycho|2000|Mary Harron|Christian Bale;Willem Dafoe;Jared Leto;Reese Witherspoon;Chloë Sevigny|Thriller;Drama;Crime|Lionsgate||10|7.6
The Fighter|2010|David O. Russell|Mark Wahlberg;Christian Bale;Amy Adams;Melissa Leo|Drama|Paramount Pictures||5.5|7.8
American Hustle|2013|David O. Russell|Christian Bale;Bradley Cooper;Amy Adams;Jennifer Lawrence;Jeremy Renner|Crime;Drama|Columbia Pictures||7|7.2
Silver Linings Playbook|2012|David O. Russell|Bradley Cooper;Jennifer Lawrence;Robert De Niro;Jacki Weaver;Chris Tucker|Drama;Comedy;Romance|The Weinstein Company||11|7.7
The Hunger Games|2012|Gary Ross|Jennifer Lawrence;Josh Hutcherson;Liam Hemsworth;Woody Harrelson;Elizabeth Banks;Stanley Tucci|Science Fiction;Adventure;Action|Lionsgate|The Hunger Games Collection|22|7.2
Titanic|1997|James Cameron|Leonardo DiCaprio;Kate Winslet;Billy Zane;Kathy Bates;Frances Fisher;Bill Paxton|Drama;Romance|Paramount Pictures||25|7.9
Aliens|1986|James Cameron|Sigourney Weaver;Michael Biehn;Carrie Henn;Paul Reiser;Lance Henriksen;Bill Paxton|Action;Thriller;Science Fiction|20th Century Fox|Alien Collection|9.5|8.4
The Terminator|1984|James Cameron|Arnold Schwarzenegger;Michael Biehn;Linda Hamilton;Paul Winfield;Lance Henriksen|Action;Thriller;Science Fiction|Orion Pictures|The Terminator Collection|13|8.1
Terminator 2: Judgment Day|1991|James Cameron|Arnold Schwarzenegger;Linda Hamilton;Edward Furlong;Robert Patrick|Action;Thriller;Science Fiction|TriStar Pictures|The Terminator Collection|13|8.6
Avatar|2009|James Cameron|Sam Worthington;Zoe Saldaña;Sigourney Weaver;Stephen Lang;Michelle Rodriguez|Action;Adventure;Fantasy;Science Fiction|20th Century Fox|Avatar Collection|31|7.9
True Lies|1994|James Cameron|Arnold Schwarzenegger;Jamie Lee Curtis;Tom Arnold;Bill Paxton;Tia Carrere|Action;Thriller|20th Century Fox||4|7.3
Predator|1987|John McTiernan|Arnold Schwarzenegger;Carl Weathers;Elpidia Carrillo;Bill Duke;Jesse Ventura|Science Fiction;Action;Adventure|20th Century Fox|Predator Collection|8|7.8
The Silence of the Lambs|1991|Jonathan Demme|Jodie Foster;Anthony Hopkins;Scott Glenn;Ted Levine|Crime;Drama;Thriller|Orion Pictures||16|8.6
The Shawshank Redemption|1994|Frank Darabont|Tim Robbins;Morgan Freeman;Bob Gunton;William Sadler;Clancy Brown|Drama;Crime|Columbia Pictures||27|9.3
The Green Mile|1999|Frank Darabont|Tom Hanks;Michael Clarke Duncan;David Morse;Bonnie Hunt;Sam Rockwell|Fantasy;Drama;Crime|Warner Bros. Pictures||17|8.6
The Godfather|1972|Francis Ford Coppola|Marlon Brando;Al Pacino;James Caan;Robert Duvall;Diane Keaton;John Cazale|Drama;Crime|Paramount Pictures|The Godfather Collection|20|9.2
The Godfather Part II|1974|Francis Ford Coppola|Al Pacino;Robert Duvall;Diane Keaton;Robert De Niro;John Cazale;Talia Shire|Drama;Crime|Paramount Pictures|The Godfather Collection|12|9.0
The Godfather Part III|1990|Francis Ford Coppola|Al Pacino;Diane Keaton;Talia Shire;Andy García;Sofia Coppola|Crime;Drama|Paramount Pictures|The Godfather Collection|5.5|7.6
Apocalypse Now|1979|Francis Ford Coppola|Martin Sheen;Marlon Brando;Robert Duvall;Laurence Fishburne;Dennis Hopper;Harrison Ford|Drama;War|United Artists||8|8.4
Heat|1995|Michael Mann|Al Pacino;Robert De Niro;Val Kilmer;Jon Voight;Tom Sizemore;Ashley Judd|Crime;Drama;Action|Warner Bros. Pictures||7.5|8.3
Scarface|1983|Brian De Palma|Al Pacino;Steven Bauer;Michelle Pfeiffer;Mary Elizabeth Mastrantonio;Robert Loggia|Action;Crime;Drama|Universal Pictures||11|8.3
The Big Lebowski|1998|Joel Coen;Ethan Coen|Jeff Bridges;John Goodman;Julianne Moore;Steve Buscemi;Philip Seymour Hoffman;John Turturro|Comedy;Crime|Working Title Films||11|8.1
Fargo|1996|Joel Coen;Ethan Coen|Frances McDormand;William H. Macy;Steve Buscemi;Peter Stormare;Harve Presnell|Crime;Drama;Thriller|Working Title Films||7.5|8.1
No Country for Old Men|2007|Joel Coen;Ethan Coen|Tommy Lee Jones;Javier Bardem;Josh Brolin;Woody Harrelson;Kelly Macdonald|Crime;Drama;Thriller|Paramount Vantage||12|8.2
O Brother, Where Art Thou?|2000|Joel Coen;Ethan Coen|George Clooney;John Turturro;Tim Blake Nelson;John Goodman;Holly Hunter|Adventure;Comedy;Crime|Touchstone Pictures||4.7|7.7
Burn After Reading|2008|Joel Coen;Ethan Coen|George Clooney;Frances McDormand;John Malkovich;Tilda Swinton;Brad Pitt;Richard Jenkins|Comedy;Drama|Working Title Films||5.5|7.0
True Grit|2010|Joel Coen;Ethan Coen|Jeff Bridges;Hailee Steinfeld;Matt Damon;Josh Brolin;Barry Pepper|Drama;Adventure;Western|Paramount Pictures||5.5|7.6
Ocean's Eleven|2001|Steven Soderbergh|George Clooney;Brad Pitt;Matt Damon;Julia Roberts;Andy García;Don Cheadle;Bernie Mac;Casey Affleck|Thriller;Crime|Warner Bros. Pictures|Ocean's Collection|12|7.7
Ocean's Twelve|2004|Steven Soderbergh|George Clooney;Brad Pitt;Matt Damon;Catherine Zeta-Jones;Andy García;Don Cheadle;Bernie Mac;Julia Roberts|Thriller;Crime|Warner Bros. Pictures|Ocean's Collection|7|6.5
Ocean's Thirteen|2007|Steven Soderbergh|George Clooney;Brad Pitt;Matt Damon;Andy García;Don Cheadle;Bernie Mac;Al Pacino;Ellen Barkin|Crime;Thriller|Warner Bros. Pictures|Ocean's Collection|6.5|6.9
Erin Brockovich|2000|Steven Soderbergh|Julia Roberts;Albert Finney;Aaron Eckhart;Marg Helgenberger|Drama|Universal Pictures||4|7.4
Traffic|2000|Steven Soderbergh|Michael Douglas;Benicio del Toro;Catherine Zeta-Jones;Don Cheadle;Dennis Quaid|Crime;Drama;Thriller|USA Films||3|7.5
Mean Girls|2004|Mark Waters|Lindsay Lohan;Rachel McAdams;Tina Fey;Amanda Seyfried;Lacey Chabert;Tim Meadows|Comedy|Paramount Pictures||9|7.1
Superbad|2007|Greg Mottola|Jonah Hill;Michael Cera;Christopher Mintz-Plasse;Bill Hader;Seth Rogen;Emma Stone|Comedy|Columbia Pictures||7.5|7.6
Anchorman: The Legend of Ron Burgundy|2004|Adam McKay|Will Ferrell;Christina Applegate;Paul Rudd;Steve Carell;David Koechner|Comedy|DreamWorks Pictures||3.5|7.2
Step Brothers|2008|Adam McKay|Will Ferrell;John C. Reilly;Mary Steenburgen;Richard Jenkins;Adam Scott|Comedy|Columbia Pictures||4.6|6.9
Talladega Nights: The Ballad of Ricky Bobby|2006|Adam McKay|Will Ferrell;John C. Reilly;Sacha Baron Cohen;Gary Cole;Michael Clarke Duncan|Comedy|Columbia Pictures||2|6.6
Elf|2003|Jon Favreau|Will Ferrell;James Caan;Zooey Deschanel;Mary Steenburgen;Bob Newhart|Comedy;Family;Fantasy|New Line Cinema||6|7.1
`;
