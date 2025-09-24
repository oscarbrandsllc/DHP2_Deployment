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

    const STACKED_TOTALS_PLUGIN = {
      id: 'stackedTotals',
      afterDatasetsDraw(chart) {
        const pluginOptions = chart.options?.plugins?.stackedTotals;
        if (!pluginOptions) return;

        const { ctx, data, chartArea, scales } = chart;
        const metaSets = chart.getSortedVisibleDatasetMetas();
        if (!metaSets.length) return;

        const formatter = typeof pluginOptions.formatter === 'function' ? pluginOptions.formatter : (value) => value;
        const color = pluginOptions.color || '#EAEBF0';
        const padding = Number.isFinite(pluginOptions.padding) ? pluginOptions.padding : 8;
        const font = pluginOptions.font || {};
        const indexAxis = chart.options.indexAxis || 'x';
        const isHorizontal = indexAxis === 'y';

        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `${font.weight || 600} ${font.size || 12}px ${font.family || "'Product Sans', 'Google Sans', sans-serif"}`;
        ctx.textBaseline = isHorizontal ? 'middle' : 'bottom';
        ctx.textAlign = isHorizontal ? 'left' : 'center';

        if (!chartArea) {
          ctx.restore();
          return;
        }

        const labelsCount = data.labels?.length ?? 0;
        for (let index = 0; index < labelsCount; index += 1) {
          let total = 0;
          metaSets.forEach((meta) => {
            const parsed = meta.controller.getParsed(index);
            if (!parsed) return;
            const value = isHorizontal ? parsed.x : parsed.y;
            if (Number.isFinite(value)) {
              total += value;
            }
          });

          if (!total) continue;

          if (isHorizontal) {
            const xScale = scales.x;
            const yScale = scales.y;
            const x = xScale.getPixelForValue(total);
            const fallbackMeta = metaSets.find((meta) => meta.data?.[index]);
            const element = fallbackMeta?.data?.[index];
            const y = element?.y ?? yScale.getPixelForValue(data.labels[index]);
            const drawX = Math.max(Math.min(x + padding, chartArea.right - 4), chartArea.left + 4);
            ctx.fillText(formatter(total), drawX, y);
          } else {
            const xScale = scales.x;
            const yScale = scales.y;
            const x = xScale.getPixelForValue(data.labels[index] ?? index);
            const y = yScale.getPixelForValue(total);
            const drawY = Math.max(y - padding, chartArea.top + 12);
            ctx.fillText(formatter(total), x, drawY);
          }
        }

        ctx.restore();
      },
    };

    Chart.register(STACKED_TOTALS_PLUGIN);

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

    const LINEUP_VALUE_COLORS = {
      QB: '#15607a',
      RB: '#0c8184',
      WR: '#0da0a4',
      TE: '#09bb9f',
      FLEX: '#2ad2a0',
      SUPER_FLEX: '#37ebb5',
    };

    const LINEUP_PPG_COLORS = {
      QB: '#003c63',
      RB: '#005d91',
      WR: '#006da2',
      TE: '#007bb4',
      FLEX: '#008cd1',
      SUPER_FLEX: '#00a3ff',
    };

    const OVERALL_COLORS = {
      QB: '#3700B3',
      RB: '#4c02de',
      WR: '#6300ff',
      TE: '#7100ff',
      Picks: '#8700ff',
      DEFAULT: '#9400ff',
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
        radar: null,
      },
      lineupData: null,
      teams: [],
      leaderboards: { QB: [], RB: [], WR: [], TE: [] },
      activeLeaderboard: 'QB',
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

        const processed = processLeagueData(rosters, users, tradedPicks, leagueInfo);
        state.teams = processed.teams;
        state.leaderboards = processed.leaderboards;
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

    function processLeagueData(rosters, users, tradedPicks, leagueInfo) {
      const userMap = Array.isArray(users)
        ? users.reduce((acc, user) => {
            acc[user.user_id] = user;
            return acc;
          }, {})
        : {};

      const leaderboards = { QB: [], RB: [], WR: [], TE: [] };

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
        const allPlayers = (roster.players || [])
          .map((playerId) => {
            const playerInfo = state.players[playerId];
            const stats = state.playerStats[playerId] || {};
            const ktc = getKtcValue(playerId);
            const pos = playerInfo?.position;
            if (pos && overallPositional[pos] !== undefined) {
              overallPositional[pos] += ktc;
            }
            return {
              id: playerId,
              pos,
              ktc,
              name: formatPlayerName(playerInfo),
              total: stats.total ?? 0,
              ppg: stats.ppg ?? (stats.games > 0 ? stats.total / stats.games : 0),
              games: stats.games ?? 0,
            };
          })
          .sort((a, b) => b.ktc - a.ktc);

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

        (roster.players || []).forEach((playerId) => {
          const playerInfo = state.players[playerId];
          if (!playerInfo) return;
          const pos = playerInfo.position;
          if (!leaderboards[pos]) return;
          const stats = state.playerStats[playerId] || {};
          const total = stats.total ?? 0;
          const ppg = stats.ppg ?? (stats.games ? stats.total / stats.games : 0);
          if (total <= 0) return;
          leaderboards[pos].push({
            playerId,
            name: formatPlayerName(playerInfo),
            owner: teamName,
            nflTeam: playerInfo.team || '--',
            total,
            ppg,
          });
        });

        return {
          teamName,
          roster,
          overallPositional,
          startersBySlot,
          startersValueByPos,
          allPlayers,
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

      teams.sort((a, b) => b.totalValue - a.totalValue);
      return { teams, leaderboards };
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
      const overallRank = computeRank(teams, (team) => team.isUserTeam);

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

      const positionalRanks = {};
      POSITION_ORDER.forEach((pos) => {
        positionalRanks[pos] = computeRank(
          [...teams].sort((a, b) => (b.startersValueByPos[pos] || 0) - (a.startersValueByPos[pos] || 0)),
          (team) => team.isUserTeam,
        );
      });

      const chips = [
        {
          label: 'Overall Rank',
          value: formatRankValue(overallRank),
          meta: totalTeams ? `of ${totalTeams}` : '',
          accent: overallRank ? getRankColor(overallRank, totalTeams) : undefined,
        },
        {
          label: 'Total Roster Value',
          value: formatNumber(userTeam.totalValue),
          meta: 'KTC',
        },
        {
          label: 'Starter Value',
          value: formatNumber(userTeam.startersValueTotal),
          meta: starterValueRank ? `Rank ${starterValueRank}/${totalTeams}` : 'Rank NA',
          accent: starterValueRank ? getRankColor(starterValueRank, totalTeams) : undefined,
        },
      ];

      const topScorer = userTeam.allPlayers
        .filter((player) => (player.total || 0) > 0)
        .sort((a, b) => (b.total || 0) - (a.total || 0))[0];

      chips.push({
        label: 'Top Scoring Player',
        value: topScorer ? topScorer.name : '—',
        meta: topScorer ? `${topScorer.total.toFixed(1)} pts` : 'No scoring data',
        valueClass: 'chip-value--player',
      });

      chips.push(
        {
          label: 'Total FPTS',
          value: userTeam.totalFpts.toFixed(1),
          meta: fptsRank ? `Rank ${fptsRank}/${totalTeams}` : 'Rank NA',
          accent: fptsRank ? getRankColor(fptsRank, totalTeams) : undefined,
        },
        {
          label: 'Starter PPG',
          value: userTeam.starterPpgTotal.toFixed(1),
          meta: starterPpgRank ? `Rank ${starterPpgRank}/${totalTeams}` : 'Rank NA',
          accent: starterPpgRank ? getRankColor(starterPpgRank, totalTeams) : undefined,
        },
        {
          label: 'QB Starter Rank',
          value: formatRankValue(positionalRanks.QB),
          meta: totalTeams ? `of ${totalTeams}` : '',
          accent: positionalRanks.QB ? getRankColor(positionalRanks.QB, totalTeams) : undefined,
        },
        {
          label: 'RB Starter Rank',
          value: formatRankValue(positionalRanks.RB),
          meta: totalTeams ? `of ${totalTeams}` : '',
          accent: positionalRanks.RB ? getRankColor(positionalRanks.RB, totalTeams) : undefined,
        },
        {
          label: 'WR Starter Rank',
          value: formatRankValue(positionalRanks.WR),
          meta: totalTeams ? `of ${totalTeams}` : '',
          accent: positionalRanks.WR ? getRankColor(positionalRanks.WR, totalTeams) : undefined,
        },
        {
          label: 'TE Starter Rank',
          value: formatRankValue(positionalRanks.TE),
          meta: totalTeams ? `of ${totalTeams}` : '',
          accent: positionalRanks.TE ? getRankColor(positionalRanks.TE, totalTeams) : undefined,
        },
      );

      elements.summaryStats.innerHTML = chips
        .map((chip) => `
          <article class="analyzer-chip">
            <span class="chip-label">${chip.label}</span>
            <span class="${['chip-value', chip.valueClass].filter(Boolean).join(' ')}"${chip.accent ? ` style="color: ${chip.accent};"` : ''}>${chip.value}</span>
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

      const createDatasetForMetric = (metric, palette) => {
        const datasets = [];
        SLOT_ORDER.forEach((slot) => {
          const values = teams.map((team) => team.startersBySlot[slot]?.[metric] ?? 0);
          if (!values.some((value) => value > 0)) return;
          const color = palette[slot] || palette.DEFAULT || '#37ebb5';
          datasets.push({
            label: SLOT_LABELS[slot] || slot,
            slotKey: slot,
            data: values,
            backgroundColor: color,
            hoverBackgroundColor: color,
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
        value: createDatasetForMetric('value', { ...LINEUP_VALUE_COLORS, DEFAULT: '#37ebb5' }),
        ppg: createDatasetForMetric('ppg', { ...LINEUP_PPG_COLORS, DEFAULT: '#00a3ff' }),
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
          stackedTotals: {
            formatter: (value) => formatter(value),
            font: { size: 11, weight: 600 },
            padding: 10,
          },
        },
      };
    }

    function createStackedBarChart(canvas, labels, datasets, options) {
      return new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets },
        options,
      });
    }

    function getTopPlayersByMetric(players, position, metric, limit = 2) {
      if (!Array.isArray(players)) return [];
      return players
        .filter((player) => player?.pos === position)
        .map((player) => ({ ...player, _metric: Number(player?.[metric]) || 0 }))
        .sort((a, b) => b._metric - a._metric)
        .slice(0, limit)
        .map(({ _metric, ...rest }) => rest);
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
            backgroundColor: OVERALL_COLORS[pos] || OVERALL_COLORS.DEFAULT,
            hoverBackgroundColor: OVERALL_COLORS[pos] || OVERALL_COLORS.DEFAULT,
            borderColor: 'rgba(255,255,255,0.08)',
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
            stackedTotals: {
              formatter: (value) => formatNumber(value),
              font: { size: 11, weight: 600 },
              padding: 10,
            },
          },
        },
      );
    }

    function renderRadarChart(teams) {
      const userTeam = teams.find((team) => team.isUserTeam);
      if (!userTeam) return;

      const positions = POSITION_ORDER;
      const leagueAverages = {};
      const userValues = {};

      positions.forEach((pos) => {
        let totalLeaguePpg = 0;
        teams.forEach((team) => {
          const topTwo = getTopPlayersByMetric(team.allPlayers, pos, 'ppg', 2);
          totalLeaguePpg += topTwo.reduce((sum, player) => sum + (player.ppg || 0), 0);
        });
        leagueAverages[pos] = teams.length > 0 ? totalLeaguePpg / teams.length : 0;

        const userTopTwo = getTopPlayersByMetric(userTeam.allPlayers, pos, 'ppg', 2);
        userValues[pos] = userTopTwo.reduce((sum, player) => sum + (player.ppg || 0), 0);
      });

      const radarMax = roundUpTo(
        Math.max(
          0,
          ...positions.flatMap((pos) => [userValues[pos] || 0, leagueAverages[pos] || 0]),
        ),
        5,
      );

      if (state.charts.radar) {
        state.charts.radar.destroy();
      }

      state.charts.radar = new Chart(elements.radarCanvas, {
        type: 'radar',
        data: {
          labels: positions.map((pos) => SLOT_LABELS[pos] || pos),
          datasets: [
            {
              label: 'Your Team (Top 2 PPG)',
              data: positions.map((pos) => userValues[pos] || 0),
              fill: true,
              backgroundColor: 'rgba(118, 109, 255, 0.35)',
              borderColor: 'rgba(118, 109, 255, 0.95)',
              pointBackgroundColor: 'rgba(118, 109, 255, 1)',
              pointBorderColor: '#fff',
              pointRadius: 4,
            },
            {
              label: 'League Average (Top 2 PPG)',
              data: positions.map((pos) => leagueAverages[pos] || 0),
              fill: true,
              backgroundColor: 'rgba(66, 194, 255, 0.25)',
              borderColor: 'rgba(66, 194, 255, 0.9)',
              pointBackgroundColor: 'rgba(66, 194, 255, 1)',
              pointBorderColor: '#fff',
              pointRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              angleLines: { color: 'rgba(234, 235, 240, 0.1)' },
              grid: { color: 'rgba(234, 235, 240, 0.1)' },
              pointLabels: {
                color: '#EAEBF0',
                font: { size: 15, weight: '600', family: "'Product Sans', 'Google Sans', sans-serif" },
                padding: 12,
              },
              ticks: {
                color: '#EAEBF0',
                backdropColor: 'rgba(13, 14, 27, 0.65)',
                display: true,
                showLabelBackdrop: true,
                callback: (value) => formatPpg(value),
                padding: 6,
                backdropPadding: 8,
              },
              suggestedMin: 0,
              suggestedMax: radarMax,
              max: radarMax,
            },
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#EAEBF0' },
            },
          },
        },
      });
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

    function formatRankValue(rank) {
      if (!rank) return 'NA';
      return `${rank}`;
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
