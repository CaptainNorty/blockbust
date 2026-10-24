// Command-line version of the admin "Sync from TMDB" job.
//   npm run sync                      -> top 20,000 movies by vote count
//   npm run sync -- --movies 40000    -> more (over 10,000 goes year by year)
//   npm run sync -- --min-votes 50    -> vote floor for year-by-year discovery
//   npm run sync -- --refresh         -> re-fetch movies already in the database
//   npm run sync -- --no-imdb
import { consoleCtx } from './jobs.ts';
import { syncTmdb } from './tmdb-sync.ts';

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : undefined;
};

try {
  console.log(await syncTmdb({
    movies: opt('movies'), minVotes: opt('min-votes'), refresh: args.includes('--refresh'), imdb: !args.includes('--no-imdb'),
  }, consoleCtx()));
  console.log('Next: rebuild upcoming puzzles from /admin, or run npm run puzzles');
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
