(function () {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page !== 'analyzer') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const initialUsername = params.get('username');
    const initialLeagueId = params.get('leagueId');

    const elements = {
      usernameInput: document.getElementById('usernameInput'),
      leagueSelect: document.getElementById('leagueSelect'),
      loading: document.getElementById('loading'),
      summaryStats: document.getElementById('summaryStats'),
      content: document.getElementById('infographicContent'),
      lineupToggle: document.querySelectorAll('#lineup-panel .toggle-option'),
      startersCanvas: document.getElementById('startersValueChart'),
      overallCanvas: document.getElementById('overallValueChart'),
      radarCanvas: document.getElementById('radarChart'),
      standingsBody: document.getElementById('standingsTableBody'),
      leaderboardBody: document.getElementById('leaderboardTableBody'),
      leaderboardFilters: document.querySelectorAll('.analyzer-filter-group .filter-chip'),
      activeUsername: document.getElementById('activeUsername'),
      activeLeague: document.getElementById('activeLeague'),
    };

    const SLOT_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX'];
    const SLOT_LABELS = {
      QB: 'QB',
      RB: 'RB',
      WR: 'WR',
      TE: 'TE',
      FLEX: 'Flex',
      SUPER_FLEX: 'Superflex',
      Picks: 'Draft Picks',
    };

    const SLOT_ELIGIBILITY = {
      QB: ['QB'],
      RB: ['RB'],
      WR: ['WR'],
      TE: ['TE'],
      FLEX: ['RB', 'WR', 'TE'],
      SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
    };

    const SLOT_TOKEN_MAP = {
      QB: 'QB',
      RB: 'RB',
      WR: 'WR',
      TE: 'TE',
      Q: 'QB',
      R: 'RB',
      W: 'WR',
      T: 'TE',
    };

    const SLOT_ALIASES = {
      'WR/RB': 'FLEX',
      'RB/WR': 'FLEX',
      'WR/RB/TE': 'FLEX',
      'RB/WR/TE': 'FLEX',
      'W/R/T': 'FLEX',
      'FLEX': 'FLEX',
      'SUPER_FLEX': 'SUPER_FLEX',
      'QB/RB/WR/TE': 'SUPER_FLEX',
      'Q/W/R/T': 'SUPER_FLEX',
    };

    const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE'];

    const LINEUP_COLORS = {
      QB: ['rgba(255, 109, 154, 0.9)', 'rgba(255, 58, 117, 0.45)'],
      RB: ['rgba(0, 224, 189, 0.9)', 'rgba(0, 177, 150, 0.45)'],
      WR: ['rgba(92, 176, 255, 0.9)', 'rgba(110, 216, 255, 0.45)'],
      TE: ['rgba(194, 135, 255, 0.9)', 'rgba(133, 94, 255, 0.45)'],
      FLEX: ['rgba(255, 189, 120, 0.9)', 'rgba(255, 149, 102, 0.45)'],
      SUPER_FLEX: ['rgba(135, 224, 255, 0.9)', 'rgba(88, 200, 255, 0.45)'],
      Picks: ['rgba(255, 222, 140, 0.9)', 'rgba(255, 194, 82, 0.45)'],
    };

    const state = {
      userId: null,
      leagues: [],
      players: {},
      ktcOneQb: {},
      ktcSflx: {},
      playerStats: {},
      playerStatsSeason: null,
      currentLeagueId: null,
      currentLineupMetric: 'value',
      isSuperflex: false,
      cache: {},
      charts: {
        lineup: null,
        overall: null,
      },
      lineupData: null,
      teams: [],
      leaderboards: { QB: [], RB: [], WR: [], TE: [] },
      activeLeaderboard: 'QB',
      slotConfig: [],
      scoringRanks: {},
    };

    elements.usernameInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        handleFetchData();
      }
    });

    elements.leagueSelect?.addEventListener('change', () => {
      const leagueId = elements.leagueSelect.value;
      if (leagueId) {
        analyzeLeague(leagueId);
        updateActiveLeagueLabel();
      }
    });

    elements.lineupToggle.forEach((button) => {
      button.addEventListener('click', () => {
        const metric = button.dataset.metric;
        if (!metric || metric === state.currentLineupMetric) return;
        state.currentLineupMetric = metric;
        elements.lineupToggle.forEach((btn) => {
          const isActive = btn.dataset.metric === metric;
          btn.classList.toggle('active', isActive);
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        updateLineupChart();
      });
    });

    elements.leaderboardFilters.forEach((button) => {
      button.addEventListener('click', () => {
        const pos = button.dataset.pos;
        if (!pos || pos === state.activeLeaderboard) return;
        state.activeLeaderboard = pos;
        elements.leaderboardFilters.forEach((btn) => {
          const isActive = btn.dataset.pos === pos;
          btn.classList.toggle('active', isActive);
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        renderLeagueLeaders();
      });
    });

    if (initialUsername) {
      elements.usernameInput.value = initialUsername;
      setActiveUsername(initialUsername);
      handleFetchData(initialLeagueId);
    }

    async function handleFetchData(targetLeagueId) {
      const username = elements.usernameInput.value.trim();
      if (!username) {
        alert('Please enter a Sleeper username.');
        return;
      }

      setLoading(true);
      setActiveUsername(username);
      hideContent();

      try {
        await Promise.all([fetchSleeperPlayers(), fetchKTCData()]);
        await fetchUserAndLeagues(username);

        if (state.leagues.length === 0) {
          throw new Error('No active leagues found for this user in the current season.');
        }

        if (targetLeagueId) {
          const target = state.leagues.find((league) => league.league_id === targetLeagueId);
          if (target) {
            elements.leagueSelect.value = targetLeagueId;
            updateActiveLeagueLabel();
            await analyzeLeague(targetLeagueId);
            return;
          }
        }

        elements.leagueSelect.selectedIndex = 1;
        updateActiveLeagueLabel();
        await analyzeLeague(state.leagues[0].league_id);
      } catch (error) {
        console.error('Analyzer fetch error:', error);
        alert(`An error occurred while loading data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }

    function hideContent() {
      elements.content.classList.add('hidden');
      elements.summaryStats.classList.add('hidden');
    }

    function setActiveUsername(username) {
      if (elements.activeUsername) {
        elements.activeUsername.textContent = username ? `@${username}` : '—';
      }
    }

    function updateActiveLeagueLabel() {
      if (!elements.activeLeague) return;
      const selectedId = elements.leagueSelect.value;
      if (!selectedId) {
        elements.activeLeague.textContent = 'Select a league...';
        return;
      }
      const league = state.leagues.find((entry) => entry.league_id === selectedId);
      elements.activeLeague.textContent = league ? league.name : 'Select a league...';
    }

    async function fetchWithCache(url) {
      if (state.cache[url]) {
        return state.cache[url];
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      state.cache[url] = data;
      return data;
    }

    async function fetchSleeperPlayers() {
      if (Object.keys(state.players).length > 0) return;
      state.players = await fetchWithCache('https://api.sleeper.app/v1/players/nfl');
    }

    async function fetchKTCData() {
      if (Object.keys(state.ktcOneQb).length > 0) return;

      const GOOGLE_SHEET_ID = '1MDTf1IouUIrm4qabQT9E5T0FsJhQtmaX55P32XK5c_0';
      const parseCsvData = async (sheet) => {
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheet}`);
        if (!response.ok) throw new Error('Failed to load KTC data.');
        return response.text();
      };

      const [oneQbCsv, sflxCsv] = await Promise.all([
        parseCsvData('KTC_1QB'),
        parseCsvData('KTC_SFLX'),
      ]);

      state.ktcOneQb = parseKtcCsv(oneQbCsv);
      state.ktcSflx = parseKtcCsv(sflxCsv);
    }

    function parseKtcCsv(csvText) {
      if (!csvText) return {};
      const lines = csvText.split('\n').filter(Boolean);
      if (lines.length <= 1) return {};

      const parseLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i += 1) {
          const char = line[i];
          if (inQuotes) {
            if (char === '"' && line[i + 1] === '"') {
              current += '"';
              i += 1;
            } else if (char === '"') {
              inQuotes = false;
            } else {
              current += char;
            }
          } else if (char === '"') {
            inQuotes = true;
          } else if (char === ',') {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const normalize = (header) => header.replace(/[\u00a0\u202f]/g, ' ').trim().toUpperCase();
      const headers = parseLine(lines[0]);
      const headerIndex = new Map();
      headers.forEach((header, idx) => {
        headerIndex.set(normalize(header), idx);
      });

      const getValue = (columns, names) => {
        const keys = Array.isArray(names) ? names : [names];
        for (const key of keys) {
          const index = headerIndex.get(normalize(key));
          if (index !== undefined && columns[index] !== undefined) {
            return columns[index].trim();
          }
        }
        return '';
      };

      const toInt = (value) => {
        const num = parseInt(value, 10);
        return Number.isNaN(num) ? null : num;
      };

      const dataMap = {};
      lines.slice(1).forEach((line) => {
        const columns = parseLine(line);
        if (!columns.length) return;

        const pos = getValue(columns, 'POS');
        const sleeperId = getValue(columns, 'SLPR_ID');
        const ktcValue = toInt(getValue(columns, ['VALUE', 'KTC']));

        if (pos === 'RDP') {
          const pickName = getValue(columns, 'PLAYER NAME');
          if (pickName) {
            dataMap[pickName] = { ktc: ktcValue ?? 0 };
          }
          return;
        }

        if (!sleeperId || sleeperId === 'NA') return;
        dataMap[sleeperId] = { ktc: ktcValue ?? 0 };
      });

      return dataMap;
    }

    async function fetchUserAndLeagues(username) {
      const user = await fetchWithCache(`https://api.sleeper.app/v1/user/${username}`);
      if (!user || !user.user_id) {
        throw new Error('Sleeper user not found.');
      }
      state.userId = user.user_id;

      const currentYear = new Date().getFullYear();
      const leagues = await fetchWithCache(`https://api.sleeper.app/v1/user/${state.userId}/leagues/nfl/${currentYear}`);
      if (!Array.isArray(leagues) || leagues.length === 0) {
        throw new Error('No active leagues found for this user in the current season.');
      }

      state.leagues = leagues.sort((a, b) => a.name.localeCompare(b.name));
      populateLeagueSelect(state.leagues);
    }

    async function ensurePlayerStats(season) {
      if (state.playerStatsSeason === season && Object.keys(state.playerStats).length > 0) {
        return;
      }
      const url = `https://api.sleeper.app/v1/stats/nfl/regular/${season}`;
      const rawStats = await fetchWithCache(url);
      state.playerStats = transformSeasonStats(rawStats);
      state.playerStatsSeason = season;
    }

    function transformSeasonStats(rawStats) {
      const result = {};
      if (!rawStats) return result;

      const processEntry = (playerId, stats) => {
        if (!playerId || !stats) return;
        const total = toNumber(stats.pts_ppr ?? stats.fpts_ppr ?? stats.fpts ?? 0);
        const games = toNumber(stats.gp ?? stats.games_played ?? stats.gm ?? 0);
        const ppg = games > 0 ? total / games : 0;
        result[playerId] = {
          total,
          games,
          ppg,
        };
      };

      if (Array.isArray(rawStats)) {
        rawStats.forEach((entry) => {
          if (!entry) return;
          const playerId = entry.player_id || entry.playerId || entry.id;
          processEntry(playerId, entry);
        });
      } else if (typeof rawStats === 'object') {
        Object.entries(rawStats).forEach(([playerId, stats]) => {
          processEntry(playerId, stats);
        });
      }

      return result;
    }

    function toNumber(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    async function analyzeLeague(leagueId) {
      try {
        setLoading(true);
        hideContent();

        const leagueInfo = state.leagues.find((league) => league.league_id === leagueId);
        if (!leagueInfo) throw new Error('League not found.');

        state.currentLeagueId = leagueId;
        const qbSlots = leagueInfo.roster_positions.filter((slot) => slot === 'QB').length;
        const superflexSlots = leagueInfo.roster_positions.filter((slot) => slot === 'SUPER_FLEX').length;
        state.isSuperflex = qbSlots > 1 || superflexSlots > 0;

        await ensurePlayerStats(leagueInfo.season ?? new Date().getFullYear());

        const [rosters, users, tradedPicks] = await Promise.all([
          fetchWithCache(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
          fetchWithCache(`https://api.sleeper.app/v1/league/${leagueId}/users`),
          fetchWithCache(`https://api.sleeper.app/v1/league/${leagueId}/traded_picks`),
        ]);

        const slotConfig = deriveStarterSlots(leagueInfo.roster_positions || []);
        state.slotConfig = slotConfig;

        const processed = processLeagueData(rosters, users, tradedPicks, leagueInfo, slotConfig);
        state.teams = processed.teams;
        state.leaderboards = processed.leaderboards;
        state.scoringRanks = processed.scoringRanks;
        renderSummaryStats(state.teams);
        renderLineupChart(state.teams);
        renderOverallChart(state.teams);
        renderRadarChart(state.teams);
        renderStandings(state.teams);
        renderLeagueLeaders();

        elements.content.classList.remove('hidden');
        if (!elements.summaryStats.classList.contains('hidden')) {
          // already visible
        } else {
          elements.summaryStats.classList.remove('hidden');
        }
      } catch (error) {
        console.error('Analyze league error:', error);
        alert(`Failed to analyze league: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }

    function processLeagueData(rosters, users, tradedPicks, leagueInfo, slotConfig) {
      const userMap = Array.isArray(users)
        ? users.reduce((acc, user) => {
            acc[user.user_id] = user;
            return acc;
          }, {})
        : {};

      const leaderboards = { QB: [], RB: [], WR: [], TE: [] };

      const scoringTotals = [];

      const teams = (Array.isArray(rosters) ? rosters : []).map((roster) => {
        const owner = userMap[roster.owner_id] || userMap[roster.co_owner_id];
        const teamName = roster.metadata?.team_name || owner?.display_name || `Team ${roster.roster_id}`;

        const startersBySlot = {};
        SLOT_ORDER.forEach((slot) => {
          startersBySlot[slot] = { value: 0, ppg: 0, players: [] };
        });

        const startersValueByPos = { QB: 0, RB: 0, WR: 0, TE: 0 };
        const starterIds = roster.starters || [];
        const rosterPositions = leagueInfo.roster_positions || [];

        starterIds.forEach((playerId, index) => {
          const slotRaw = rosterPositions[index] || 'BN';
          const slot = normalizeSlot(slotRaw);
          if (!slot) return;
          if (!startersBySlot[slot]) {
            startersBySlot[slot] = { value: 0, ppg: 0, players: [] };
          }

          const playerInfo = state.players[playerId];
          const playerStats = state.playerStats[playerId] || {};
          const ktc = getKtcValue(playerId);
          const ppg = playerStats.ppg ?? 0;

          startersBySlot[slot].value += ktc;
          startersBySlot[slot].ppg += ppg;

          const playerName = formatPlayerName(playerInfo);
          startersBySlot[slot].players.push({ name: playerName, value: ktc, ppg });

          const pos = playerInfo?.position;
          if (pos && startersValueByPos[pos] !== undefined) {
            startersValueByPos[pos] += ktc;
          }
        });

        const overallPositional = { QB: 0, RB: 0, WR: 0, TE: 0, Picks: 0 };

        const playersDetailed = (roster.players || [])
          .map((playerId) => {
            const playerInfo = state.players[playerId];
            if (!playerInfo) return null;
            const pos = playerInfo.position;
            const ktc = getKtcValue(playerId);
            const stats = state.playerStats[playerId] || {};
            const totalFpts = stats.total ?? 0;
            const ppg = stats.ppg ?? (stats.games ? stats.total / stats.games : 0);
            return {
              id: playerId,
              pos,
              ktc,
              name: formatPlayerName(playerInfo),
              totalFpts,
              ppg,
            };
          })
          .filter((player) => player && player.pos)
          .sort((a, b) => b.ktc - a.ktc);

        playersDetailed.forEach((player) => {
          if (overallPositional[player.pos] !== undefined) {
            overallPositional[player.pos] += player.ktc;
          }
        });

        const playersByPos = playersDetailed.reduce((acc, player) => {
          if (!acc[player.pos]) {
            acc[player.pos] = [];
          }
          acc[player.pos].push(player);
          return acc;
        }, {});

        Object.values(playersByPos).forEach((group) => {
          group.sort((a, b) => b.ktc - a.ktc);
        });

        const optimalSlotMap = allocateOptimalStarters(slotConfig, playersByPos);

        const optimalSlots = slotConfig.map((slot) => {
          const allocation = optimalSlotMap[slot.key];
          return {
            slotKey: slot.key,
            slot: slot.slot,
            label: slot.label,
            value: allocation?.ktc ?? 0,
            player: allocation || null,
          };
        });

        const allPlayers = playersDetailed.slice();

        getOwnedPicks(roster.roster_id, rosters, tradedPicks, leagueInfo).forEach((pick) => {
          overallPositional.Picks += getKtcValue(pick.label);
        });

        const totalValue = Object.values(overallPositional).reduce((sum, value) => sum + value, 0);
        const startersValueTotal = SLOT_ORDER.reduce((sum, slot) => sum + (startersBySlot[slot]?.value ?? 0), 0);
        const starterPpgTotal = SLOT_ORDER.reduce((sum, slot) => sum + (startersBySlot[slot]?.ppg ?? 0), 0);

        const settings = roster.settings || {};
        const wins = toNumber(settings.wins);
        const losses = toNumber(settings.losses);
        const ties = toNumber(settings.ties);
        const pf = combineScore(settings.fpts, settings.fpts_decimal);
        const pa = combineScore(settings.fpts_against, settings.fpts_against_decimal);
        const gamesPlayed = wins + losses + ties;
        const teamPpg = gamesPlayed > 0 ? pf / gamesPlayed : 0;

        const record = ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;

        playersDetailed.forEach((player) => {
          if (player.totalFpts > 0 && leaderboards[player.pos]) {
            leaderboards[player.pos].push({
              playerId: player.id,
              name: player.name,
              owner: teamName,
              nflTeam: state.players[player.id]?.team || '--',
              total: player.totalFpts,
              ppg: player.ppg,
            });
          }

          if (player.totalFpts > 0) {
            scoringTotals.push({
              playerId: player.id,
              total: player.totalFpts,
              ppg: player.ppg,
              name: player.name,
            });
          }
        });

        return {
          teamName,
          roster,
          overallPositional,
          startersBySlot,
          startersValueByPos,
          allPlayers,
          optimalSlots,
          optimalSlotMap,
          playersDetailed,
          totalValue,
          startersValueTotal,
          starterPpgTotal,
          wins,
          losses,
          ties,
          record,
          totalFpts: pf,
          pointsAgainst: pa,
          teamPpg,
          isUserTeam: roster.owner_id === state.userId,
        };
      });

      Object.keys(leaderboards).forEach((pos) => {
        leaderboards[pos] = leaderboards[pos]
          .sort((a, b) => {
            if (b.total !== a.total) return b.total - a.total;
            if (b.ppg !== a.ppg) return b.ppg - a.ppg;
            return a.name.localeCompare(b.name);
          })
          .slice(0, 10);
      });

      const scoringRanks = {};
      scoringTotals
        .sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          if (b.ppg !== a.ppg) return b.ppg - a.ppg;
          return a.name.localeCompare(b.name);
        })
        .forEach((entry, index) => {
          if (!scoringRanks[entry.playerId]) {
            scoringRanks[entry.playerId] = {
              rank: index + 1,
              total: entry.total,
              ppg: entry.ppg,
            };
          }
        });

      teams.sort((a, b) => b.totalValue - a.totalValue);
      return { teams, leaderboards, scoringRanks };
    }

    function normalizeSlot(slot) {
      if (!slot) return null;
      if (SLOT_ORDER.includes(slot)) return slot;
      const normalized = SLOT_ALIASES[slot];
      if (normalized) return normalized;
      if (slot.includes('FLEX')) return 'FLEX';
      if (slot.includes('QB')) return 'QB';
      if (slot.includes('RB')) return 'RB';
      if (slot.includes('WR')) return 'WR';
      if (slot.includes('TE')) return 'TE';
      return null;
    }

    function deriveStarterSlots(rosterPositions) {
      const counts = {};
      const config = [];
      (rosterPositions || []).forEach((slotRaw) => {
        const normalized = normalizeSlot(slotRaw);
        if (!normalized) return;
        counts[normalized] = (counts[normalized] || 0) + 1;
        const index = counts[normalized];
        const baseLabel = SLOT_LABELS[normalized] || normalized;
        const label = index > 1 ? `${baseLabel} ${index}` : baseLabel;
        const eligiblePositions = getEligiblePositions(slotRaw, normalized);
        config.push({
          key: `${normalized}-${index}`,
          slot: normalized,
          label,
          eligiblePositions,
        });
      });
      return config;
    }

    function getEligiblePositions(slotRaw, normalized) {
      const base = SLOT_ELIGIBILITY[normalized] ? [...SLOT_ELIGIBILITY[normalized]] : [];
      if (!slotRaw) return base.length ? base : [normalized];

      const upper = String(slotRaw).toUpperCase();
      if (SLOT_ELIGIBILITY[upper]) {
        return [...SLOT_ELIGIBILITY[upper]];
      }

      const cleaned = upper.replace(/[^A-Z\/]/g, '');
      if (!cleaned.includes('/')) {
        return base.length ? base : [normalized];
      }

      const tokens = cleaned
        .split('/')
        .map((token) => SLOT_TOKEN_MAP[token] || token)
        .filter((token) => POSITION_ORDER.includes(token));

      if (tokens.length) {
        return Array.from(new Set(tokens));
      }

      return base.length ? base : [normalized];
    }

    function allocateOptimalStarters(slotConfig = [], playersByPos = {}) {
      const available = {};
      Object.keys(playersByPos).forEach((pos) => {
        available[pos] = playersByPos[pos].slice();
      });

      const takeBest = (positions) => {
        let chosenPlayer = null;
        let chosenPos = null;
        positions.forEach((pos) => {
          const pool = available[pos];
          if (!pool || pool.length === 0) return;
          const candidate = pool[0];
          if (!chosenPlayer || candidate.ktc > chosenPlayer.ktc) {
            chosenPlayer = candidate;
            chosenPos = pos;
          }
        });
        if (chosenPlayer && chosenPos) {
          available[chosenPos].shift();
          return { ...chosenPlayer };
        }
        return null;
      };

      const results = {};
      slotConfig.forEach((slot) => {
        const eligible = (slot.eligiblePositions && slot.eligiblePositions.length > 0)
          ? slot.eligiblePositions
          : SLOT_ELIGIBILITY[slot.slot] || [slot.slot];

        let selection = null;
        if (slot.slot === 'SUPER_FLEX') {
          selection = takeBest(['QB']);
          if (!selection) {
            selection = takeBest(eligible);
          }
        } else {
          selection = takeBest(eligible);
        }

        results[slot.key] = selection;
      });

      return results;
    }

    function formatRadarName(name) {
      if (!name) return 'No Player';
      if (name.length <= 18) return name;
      const parts = name.split(' ');
      if (parts.length >= 2) {
        const first = parts[0];
        const last = parts[parts.length - 1];
        const lastInitial = last ? `${last.charAt(0)}.` : '';
        return `${first} ${lastInitial}`.trim();
      }
      return name.slice(0, 18);
    }

    function formatPlayerName(playerInfo) {
      if (!playerInfo) return 'Unknown Player';
      if (playerInfo.full_name) return playerInfo.full_name;
      const first = playerInfo.first_name ? `${playerInfo.first_name} ` : '';
      const last = playerInfo.last_name || '';
      const name = `${first}${last}`.trim();
      return name || 'Unknown Player';
    }

    function combineScore(base, decimal) {
      const whole = toNumber(base);
      const fraction = typeof decimal === 'string' || typeof decimal === 'number'
        ? toNumber(decimal) / 100
        : 0;
      return whole + fraction;
    }

    function getKtcValue(id) {
      if (!id) return 0;
      const source = state.isSuperflex ? state.ktcSflx : state.ktcOneQb;
      return source[id]?.ktc ?? 0;
    }

    function getOwnedPicks(rosterId, allRosters, tradedPicks, leagueInfo) {
      const currentYear = new Date().getFullYear();
      const picks = [];
      const draftRounds = leagueInfo?.settings?.draft_rounds || 4;

      (allRosters || []).forEach((roster) => {
        for (let year = 1; year <= 4; year += 1) {
          const season = String(currentYear + year);
          for (let round = 1; round <= draftRounds; round += 1) {
            picks.push({
              season,
              round,
              roster_id: roster.roster_id,
              owner_id: roster.roster_id,
            });
          }
        }
      });

      (tradedPicks || []).forEach((trade) => {
        const pickIndex = picks.findIndex(
          (pick) => pick.season === trade.season && pick.round === trade.round && pick.roster_id === trade.roster_id,
        );
        if (pickIndex !== -1) {
          picks[pickIndex].owner_id = trade.owner_id;
        }
      });

      return picks
        .filter((pick) => pick.owner_id === rosterId)
        .sort((a, b) => a.season.localeCompare(b.season) || a.round - b.round)
        .map((pick) => ({ ...pick, label: `${pick.season} Mid ${ordinal(pick.round)}` }));
    }

    function ordinal(i) {
      const j = i % 10;
      const k = i % 100;
      if (j === 1 && k !== 11) return `${i}st`;
      if (j === 2 && k !== 12) return `${i}nd`;
      if (j === 3 && k !== 13) return `${i}rd`;
      return `${i}th`;
    }

    function renderSummaryStats(teams) {
      const userTeam = teams.find((team) => team.isUserTeam);
      if (!userTeam) {
        elements.summaryStats.classList.add('hidden');
        return;
      }

      const totalTeams = teams.length;
      const starterValueRank = computeRank(
        [...teams].sort((a, b) => b.startersValueTotal - a.startersValueTotal),
        (team) => team.isUserTeam,
      );

      const fptsRank = computeRank(
        [...teams].sort((a, b) => b.totalFpts - a.totalFpts),
        (team) => team.isUserTeam,
      );

      const starterPpgRank = computeRank(
        [...teams].sort((a, b) => b.starterPpgTotal - a.starterPpgTotal),
        (team) => team.isUserTeam,
      );

      const standingsOrder = teams
        .slice()
        .sort((a, b) => {
          const winPctA = computeWinPct(a.wins, a.losses, a.ties);
          const winPctB = computeWinPct(b.wins, b.losses, b.ties);
          if (winPctB !== winPctA) return winPctB - winPctA;
          if (b.wins !== a.wins) return b.wins - a.wins;
          if (b.totalFpts !== a.totalFpts) return b.totalFpts - a.totalFpts;
          return a.teamName.localeCompare(b.teamName);
        });

      const standingsRank = computeRank(standingsOrder, (team) => team.isUserTeam);

      const topScorer = (userTeam.playersDetailed || [])
        .slice()
        .sort((a, b) => b.totalFpts - a.totalFpts)
        .find((player) => player.totalFpts > 0);

      const topScorerRank = topScorer ? state.scoringRanks[topScorer.id]?.rank : null;
      const totalRankedPlayers = Object.keys(state.scoringRanks || {}).length;

      const chips = [
        {
          label: 'Ranking',
          value: standingsRank ? ordinal(standingsRank) : 'NA',
          meta: userTeam.record
            ? `Record ${userTeam.record}${totalTeams ? ` • ${totalTeams}-Team League` : ''}`
            : totalTeams
              ? `${totalTeams}-Team League`
              : '',
          accent: standingsRank ? getRankColor(standingsRank, totalTeams) : undefined,
        },
        {
          label: 'Total Roster Value',
          value: formatNumber(userTeam.totalValue),
          meta: 'KTC',
        },
        {
          label: 'Starter Value',
          value: formatNumber(userTeam.startersValueTotal),
          meta: starterValueRank ? `#${starterValueRank} of ${totalTeams}` : 'Rank NA',
          accent: starterValueRank ? getRankColor(starterValueRank, totalTeams) : undefined,
        },
        {
          label: 'Total FPTS',
          value: userTeam.totalFpts.toFixed(1),
          meta: fptsRank ? `#${fptsRank} of ${totalTeams}` : 'Rank NA',
          accent: fptsRank ? getRankColor(fptsRank, totalTeams) : undefined,
        },
        {
          label: 'Starter PPG',
          value: userTeam.starterPpgTotal.toFixed(1),
          meta: starterPpgRank ? `#${starterPpgRank} of ${totalTeams}` : 'Rank NA',
          accent: starterPpgRank ? getRankColor(starterPpgRank, totalTeams) : undefined,
        },
        {
          label: 'Top Scoring Player',
          value: topScorer ? topScorer.name : 'No data',
          meta: topScorer
            ? `${topScorer.totalFpts.toFixed(1)} pts${topScorerRank ? ` • #${topScorerRank}` : ''}`
            : 'No fantasy scoring yet',
          accent:
            topScorer && topScorerRank
              ? getRankColor(topScorerRank, totalRankedPlayers || totalTeams || 1)
              : undefined,
        },
      ];

      elements.summaryStats.innerHTML = chips
        .map((chip) => `
          <article class="analyzer-chip">
            <span class="chip-label">${chip.label}</span>
            <span class="chip-value"${chip.accent ? ` style="color: ${chip.accent};"` : ''}>${chip.value}</span>
            <span class="chip-meta">${chip.meta}</span>
          </article>
        `)
        .join('');

      elements.summaryStats.classList.remove('hidden');
    }

    function renderLineupChart(teams) {
      state.lineupData = buildLineupDatasets(teams);
      if (state.charts.lineup) {
        state.charts.lineup.destroy();
      }
      const metricConfig = state.lineupData[state.currentLineupMetric];
      state.charts.lineup = createStackedBarChart(
        elements.startersCanvas,
        teams.map((team) => team.teamName),
        metricConfig.datasets,
        buildLineupOptions(metricConfig.max, state.currentLineupMetric, teams),
      );
    }

    function updateLineupChart() {
      if (!state.charts.lineup || !state.lineupData) return;
      const metricConfig = state.lineupData[state.currentLineupMetric];
      state.charts.lineup.data.datasets = metricConfig.datasets;
      state.charts.lineup.options = buildLineupOptions(metricConfig.max, state.currentLineupMetric, state.teams);
      state.charts.lineup.update();
    }

    function buildLineupDatasets(teams) {
      const labels = teams.map((team) => team.teamName);

      const createDatasetForMetric = (metric) => {
        const datasets = [];
        SLOT_ORDER.forEach((slot) => {
          const values = teams.map((team) => team.startersBySlot[slot]?.[metric] ?? 0);
          if (!values.some((value) => value > 0)) return;
          datasets.push({
            label: SLOT_LABELS[slot] || slot,
            slotKey: slot,
            data: values,
            backgroundColor: (context) => createGradient(context, LINEUP_COLORS[slot] || LINEUP_COLORS.FLEX),
            borderColor: 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            borderRadius: 10,
            barPercentage: 0.9,
            categoryPercentage: 0.7,
            stack: 'lineup',
          });
        });

        const maxValue = Math.max(
          0,
          ...teams.map((team) => (metric === 'value' ? team.startersValueTotal : team.starterPpgTotal)),
        );

        return { labels, datasets, max: maxValue };
      };

      return {
        value: createDatasetForMetric('value'),
        ppg: createDatasetForMetric('ppg'),
      };
    }

    function buildLineupOptions(max, metric, teams) {
      const formatter = metric === 'value' ? formatNumber : formatPpg;
      const axisMax = metric === 'value'
        ? roundUpTo(max, 5000)
        : roundUpTo(max, 5);

      return {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        interaction: { mode: 'nearest', intersect: false },
        scales: {
          x: {
            stacked: true,
            grid: { color: 'rgba(234, 235, 240, 0.08)' },
            ticks: {
              color: '#EAEBF0',
              callback: (value) => formatter(value),
            },
            max: axisMax,
          },
          y: {
            stacked: true,
            grid: { display: false },
            ticks: {
              color: '#EAEBF0',
            },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#EAEBF0',
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(13, 14, 35, 0.92)',
            borderColor: 'rgba(118, 109, 255, 0.5)',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const value = context.raw ?? 0;
                return `${context.dataset.label}: ${formatter(value)}`;
              },
              footer: (tooltipItems) => {
                if (!tooltipItems.length) return '';
                const teamIndex = tooltipItems[0].dataIndex;
                const slotKey = tooltipItems[0].dataset.slotKey;
                const team = teams[teamIndex];
                const players = team?.startersBySlot?.[slotKey]?.players || [];
                const valueKey = metric === 'value' ? 'value' : 'ppg';
                return players
                  .slice()
                  .sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0))
                  .slice(0, 3)
                  .map((player) => `${player.name}: ${formatter(player[valueKey] || 0)}`)
                  .join('\n');
              },
            },
          },
        },
      };
    }

    function createGradient(context, colors = ['rgba(118, 109, 255, 0.8)', 'rgba(118, 109, 255, 0.4)']) {
      const { chart } = context;
      const { ctx, chartArea } = chart;
      if (!chartArea) return colors[0];
      const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1] ?? colors[0]);
      return gradient;
    }

    function createStackedBarChart(canvas, labels, datasets, options) {
      return new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets },
        options,
      });
    }

    function renderOverallChart(teams) {
      if (state.charts.overall) {
        state.charts.overall.destroy();
      }

      const labels = teams.map((team) => team.teamName);
      const positions = ['QB', 'RB', 'WR', 'TE', 'Picks'];
      const datasets = positions
        .map((pos) => {
          const values = teams.map((team) => team.overallPositional[pos] || 0);
          if (!values.some((value) => value > 0)) return null;
          return {
            label: SLOT_LABELS[pos] || pos,
            slotKey: pos,
            data: values,
            backgroundColor: (context) => createGradient(context, LINEUP_COLORS[pos] || LINEUP_COLORS.FLEX),
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            borderRadius: 10,
            barPercentage: 0.9,
            categoryPercentage: 0.7,
            stack: 'overall',
          };
        })
        .filter(Boolean);

      const maxValue = Math.max(0, ...teams.map((team) => team.totalValue));

      state.charts.overall = createStackedBarChart(
        elements.overallCanvas,
        labels,
        datasets,
        {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          interaction: { mode: 'nearest', intersect: false },
          scales: {
            x: {
              stacked: true,
              grid: { color: 'rgba(234, 235, 240, 0.08)' },
              ticks: {
                color: '#EAEBF0',
                callback: (value) => formatNumber(value),
              },
              max: roundUpTo(maxValue, 10000),
            },
            y: {
              stacked: true,
              grid: { display: false },
              ticks: { color: '#EAEBF0' },
            },
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#EAEBF0', usePointStyle: true },
            },
            tooltip: {
              backgroundColor: 'rgba(13, 14, 35, 0.92)',
              borderColor: 'rgba(118, 109, 255, 0.5)',
              borderWidth: 1,
              callbacks: {
                label: (context) => {
                  const value = context.raw ?? 0;
                  return `${context.dataset.label}: ${formatNumber(value)}`;
                },
                footer: (tooltipItems) => {
                  if (!tooltipItems.length) return '';
                  const teamIndex = tooltipItems[0].dataIndex;
                  const slotKey = tooltipItems[0].dataset.slotKey;
                  const players = state.teams[teamIndex]?.allPlayers || [];
                  const list = players.filter((player) => player.pos === slotKey).slice(0, 3);
                  return list
                    .map((player) => `${player.name}: ${formatNumber(player.ktc)}`)
                    .join('\n');
                },
              },
            },
          },
        },
      );
    }

    function renderRadarChart(teams) {
      const container = elements.radarCanvas;
      if (!container || !window.Plotly) {
        return;
      }

      const slotConfig = state.slotConfig || [];
      if (!teams.length || !slotConfig.length) {
        Plotly.purge(container);
        container.innerHTML = '<div class="analyzer-empty">No starter configuration available.</div>';
        return;
      }

      const userTeam = teams.find((team) => team.isUserTeam);
      if (!userTeam) {
        Plotly.purge(container);
        return;
      }

      container.innerHTML = '';

      const axisLabels = slotConfig.map((slot) => slot.label);
      const userSeries = slotConfig.map((slot) => userTeam.optimalSlotMap?.[slot.key]?.ktc ?? 0);

      const leagueAverages = slotConfig.map((slot) => {
        let total = 0;
        let count = 0;
        teams.forEach((team) => {
          const value = team.optimalSlotMap?.[slot.key]?.ktc;
          if (Number.isFinite(value) && value > 0) {
            total += value;
            count += 1;
          }
        });
        return count > 0 ? total / count : 0;
      });

      const maxValue = Math.max(1, ...userSeries, ...leagueAverages);
      const normalize = (value) => (value > 0 ? (value / maxValue) * 100 : 0);

      const normalizedUser = userSeries.map((value) => normalize(value));
      const normalizedLeague = leagueAverages.map((value) => normalize(value));

      const closedLabels = [...axisLabels, axisLabels[0]];
      const closedUser = [...normalizedUser, normalizedUser[0]];
      const closedLeague = [...normalizedLeague, normalizedLeague[0]];

      const bandStyles = [
        { value: 100, fill: '#2c334f62', line: '#525a7739', width: 1 },
        { value: 80, fill: '#2D345153', line: '#525a7729', width: 0.9 },
        { value: 60, fill: '#2F365250', line: '#525a7729', width: 0.9 },
        { value: 40, fill: '#30375455', line: '#525a7729', width: 0.9 },
        { value: 20, fill: '#31385565', line: '#525a7735', width: 0.9 },
      ];

      const backgroundTraces = bandStyles.map((style) => ({
        type: 'scatterpolar',
        r: new Array(closedLabels.length).fill(style.value),
        theta: closedLabels,
        mode: 'lines',
        fill: 'toself',
        opacity: 1,
        fillcolor: style.fill,
        line: { color: style.line, width: style.width },
        hoverinfo: 'skip',
        showlegend: false,
      }));

      const userMarkerColors = [...axisLabels.map(() => '#766dff'), 'rgba(0,0,0,0)'];
      const userMarkerSizes = [...axisLabels.map(() => 6), 0];
      const leagueMarkerColors = [...axisLabels.map(() => '#42c2ff'), 'rgba(0,0,0,0)'];
      const leagueMarkerSizes = [...axisLabels.map(() => 5), 0];

      const leagueTrace = {
        type: 'scatterpolar',
        r: closedLeague,
        theta: closedLabels,
        mode: 'lines+markers',
        fill: 'toself',
        fillcolor: 'rgba(66, 194, 255, 0.28)',
        line: { color: '#42c2ff', width: 2 },
        marker: { color: leagueMarkerColors, size: leagueMarkerSizes, line: { color: '#0D0E1B', width: 1 } },
        hoverinfo: 'skip',
        showlegend: false,
      };

      const userTrace = {
        type: 'scatterpolar',
        r: closedUser,
        theta: closedLabels,
        mode: 'lines+markers',
        fill: 'toself',
        fillcolor: 'rgba(118, 109, 255, 0.32)',
        line: { color: '#766dff', width: 2 },
        marker: { color: userMarkerColors, size: userMarkerSizes, line: { color: '#0D0E1B', width: 1 } },
        hoverinfo: 'skip',
        showlegend: false,
      };

      const textEntries = slotConfig.map((slot, index) => {
        const allocation = userTeam.optimalSlotMap?.[slot.key];
        const userValue = userSeries[index] || 0;
        const leagueValue = leagueAverages[index] || 0;
        const diff = userValue - leagueValue;

        let diffLabel;
        let diffColor;
        if (!allocation) {
          diffLabel = 'No eligible';
          diffColor = '#9096C0';
        } else if (Math.abs(diff) < 1) {
          diffLabel = 'Even vs Avg';
          diffColor = '#BDC1D8';
        } else {
          const symbol = diff > 0 ? '+' : '−';
          diffLabel = `${symbol}${formatNumber(Math.abs(diff))} vs Avg`;
          diffColor = diff > 0 ? '#00F5A0' : '#FF47A6';
        }

        const valueLabel = allocation ? `${formatNumber(userValue)} KTC` : '0 KTC';
        const primary = allocation ? formatRadarName(allocation.name) : slot.label;

        return `<span style="color:#EAEBF0;">${primary}</span><br><span style="color:${diffColor};">${diffLabel}</span><br><span style="color:#9096C0;">${valueLabel}</span>`;
      });

      const textTrace = {
        type: 'scatterpolar',
        r: normalizedUser,
        theta: axisLabels,
        mode: 'text',
        text: textEntries,
        textposition: 'top center',
        textfont: { size: 10, family: "'Product Sans','Google Sans','Quicksand',sans-serif" },
        hoverinfo: 'skip',
        showlegend: false,
      };

      const traces = [...backgroundTraces, leagueTrace, userTrace, textTrace];

      const layout = {
        polar: {
          bgcolor: 'rgba(0,0,0,0)',
          radialaxis: {
            range: [0, 100],
            showgrid: false,
            ticks: '',
            showticklabels: false,
            showline: false,
            linewidth: 0,
            linecolor: 'rgba(0,0,0,0)',
          },
          angularaxis: {
            showgrid: false,
            showline: false,
            tickmode: 'array',
            tickvals: axisLabels,
            ticktext: axisLabels,
            tickfont: { color: '#EAEBF0', size: 11, family: "'Product Sans','Google Sans','Quicksand',sans-serif" },
            direction: 'counterclockwise',
            rotation: 90,
            layer: 'above traces',
            categoryarray: axisLabels,
            categoryorder: 'array',
          },
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        showlegend: false,
        annotations: [
          {
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 1.12,
            text: userTeam.teamName,
            showarrow: false,
            font: { color: '#766dff', size: 18, family: "'Product Sans','Google Sans','Quicksand',sans-serif" },
            xanchor: 'center',
            yanchor: 'bottom',
          },
          {
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: -0.08,
            text: 'League Average',
            showarrow: false,
            font: { color: '#42c2ff', size: 12, family: "'Product Sans','Google Sans','Quicksand',sans-serif" },
            xanchor: 'center',
            yanchor: 'top',
          },
        ],
        margin: { l: 45, r: 45, t: 70, b: 30 },
        hovermode: false,
        dragmode: false,
      };

      Plotly.react(
        container,
        traces,
        layout,
        {
          displayModeBar: false,
          responsive: true,
        },
      );
    }

    function renderStandings(teams) {
      const standings = teams
        .map((team) => ({
          teamName: team.teamName,
          wins: team.wins,
          losses: team.losses,
          ties: team.ties,
          record: team.record,
          pf: team.totalFpts,
          pa: team.pointsAgainst,
          winPct: computeWinPct(team.wins, team.losses, team.ties),
        }))
        .sort((a, b) => {
          if (b.winPct !== a.winPct) return b.winPct - a.winPct;
          if (b.wins !== a.wins) return b.wins - a.wins;
          if (b.pf !== a.pf) return b.pf - a.pf;
          return a.teamName.localeCompare(b.teamName);
        });

      elements.standingsBody.innerHTML = standings
        .map((team) => `
          <tr>
            <td data-label="Team">${team.teamName}</td>
            <td data-label="Record">${team.record}</td>
            <td data-label="PF">${team.pf.toFixed(1)}</td>
            <td data-label="PA">${team.pa.toFixed(1)}</td>
          </tr>
        `)
        .join('');
    }

    function computeWinPct(wins, losses, ties) {
      const games = wins + losses + ties;
      if (games === 0) return 0;
      return (wins + ties * 0.5) / games;
    }

    function renderLeagueLeaders() {
      const position = state.activeLeaderboard;
      const leaders = state.leaderboards[position] || [];
      if (!leaders.length) {
        elements.leaderboardBody.innerHTML = '<tr><td colspan="6" class="empty-row">No scoring data available.</td></tr>';
        return;
      }

      elements.leaderboardBody.innerHTML = leaders
        .map((entry, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${entry.name}</td>
            <td>${entry.nflTeam}</td>
            <td>${entry.owner}</td>
            <td>${entry.total.toFixed(1)}</td>
            <td>${entry.ppg.toFixed(1)}</td>
          </tr>
        `)
        .join('');
    }

    function populateLeagueSelect(leagues) {
      const select = elements.leagueSelect;
      if (!select) return;
      select.innerHTML = '<option value="">Select a league...</option>';
      leagues.forEach((league) => {
        const option = document.createElement('option');
        option.value = league.league_id;
        option.textContent = league.name;
        select.appendChild(option);
      });
      select.disabled = false;
    }

    function setLoading(isLoading) {
      if (!elements.loading) return;
      if (isLoading) {
        elements.loading.classList.remove('hidden');
      } else {
        elements.loading.classList.add('hidden');
      }
    }

    function roundUpTo(value, step) {
      if (value <= 0) return step;
      return Math.ceil(value / step) * step;
    }

    function computeRank(list, predicate) {
      const index = list.findIndex(predicate);
      return index === -1 ? null : index + 1;
    }

    function formatNumber(value) {
      if (!Number.isFinite(value)) return '0';
      if (Math.abs(value) >= 1000) {
        return Math.round(value).toLocaleString();
      }
      return value.toFixed(0);
    }

    function formatPpg(value) {
      if (!Number.isFinite(value)) return '0.0';
      return value.toFixed(1);
    }

    function getRankColor(rank, total) {
      const percentile = (total - rank + 1) / total;
      if (percentile >= 0.8) return '#00EBC7';
      if (percentile >= 0.6) return '#58A7FF';
      if (percentile >= 0.4) return '#EAEBF0';
      if (percentile >= 0.2) return '#FF7F50';
      return '#FF3A75';
    }
  });
})();
