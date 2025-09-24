(function () {
  const POS_COLORS = {
    QB: 'rgba(255, 84, 131, 0.82)',
    RB: 'rgba(47, 220, 180, 0.82)',
    WR: 'rgba(88, 167, 255, 0.82)',
    TE: 'rgba(186, 142, 255, 0.82)',
    FLEX: 'rgba(255, 179, 96, 0.8)',
    SUPER_FLEX: 'rgba(228, 105, 255, 0.8)',
    PICKS: 'rgba(255, 214, 84, 0.82)',
    OTHER: 'rgba(148, 156, 199, 0.6)'
  };

  const RING_TRACES = [
    { value: 100, fill: '#2c334f62', stroke: '#525a7739', width: 1 },
    { value: 80, fill: '#2D345153', stroke: '#525a7729', width: 0.9 },
    { value: 60, fill: '#2F365250', stroke: '#525a7729', width: 0.9 },
    { value: 40, fill: '#30375455', stroke: '#525a7729', width: 0.9 },
    { value: 20, fill: '#31385565', stroke: '#525a7735', width: 0.9 }
  ];

  const RADAR_LAYOUT = {
    polar: {
      bgcolor: '#141a32',
      radialaxis: {
        range: [0, 100],
        showgrid: false,
        ticks: '',
        showticklabels: false,
        showline: false,
        linewidth: 0,
        linecolor: 'rgba(0,0,0,0)'
      },
      angularaxis: {
        showgrid: false,
        showline: false,
        tickmode: 'array',
        tickfont: { color: 'white', size: 10.5, family: 'Orbitron' },
        direction: 'counterclockwise',
        rotation: -0.55,
        layer: 'above traces'
      }
    },
    paper_bgcolor: '#141a32',
    showlegend: false,
    margin: { l: 45, r: 45, t: 70, b: 30 },
    hovermode: false,
    dragmode: false
  };

  const GOOGLE_SHEET_ID = '1MDTf1IouUIrm4qabQT9E5T0FsJhQtmaX55P32XK5c_0';

  function safeRound(value, precision = 1) {
    if (!Number.isFinite(value)) return '0.0';
    const factor = 10 ** precision;
    return (Math.round(value * factor) / factor).toFixed(precision);
  }

  function ordinal(num) {
    const n = Math.abs(Math.trunc(num));
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
    switch (n % 10) {
      case 1: return `${n}st`;
      case 2: return `${n}nd`;
      case 3: return `${n}rd`;
      default: return `${n}th`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page !== 'analyzer') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const initialUsername = params.get('username') || '';
    const initialLeague = params.get('leagueId') || '';

    const usernameInput = document.getElementById('usernameInput');
    const leagueSelect = document.getElementById('leagueSelect');
    const loadingIndicator = document.getElementById('loading');
    const infographicContent = document.getElementById('infographicContent');
    const summaryStats = document.getElementById('summaryStats');
    const lineupModeToggle = document.getElementById('lineupModeToggle');
    const leadersToggle = document.getElementById('leadersToggle');
    const standingsTableBody = document.querySelector('#standingsTable tbody');
    const leadersTableBody = document.querySelector('#leadersTable tbody');
    const openRostersButton = document.getElementById('openRostersButton');

    let lineupChartInstance = null;
    let teamValueChartInstance = null;

    const state = {
      cache: new Map(),
      userId: null,
      leagues: [],
      currentLeagueId: null,
      isSuperflex: false,
      starterSlotPlan: [],
      lineupMode: 'value',
      leaderPosition: 'QB',
      players: {},
      ktcOneQb: {},
      ktcSflx: {},
      playerStats: {},
      teams: []
    };

    usernameInput.value = initialUsername;

    usernameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        handleFetchData();
      }
    });

    leagueSelect.addEventListener('change', () => {
      const leagueId = leagueSelect.value;
      if (!leagueId || leagueId === 'Select a league...') return;
      analyzeLeague(leagueId).catch(console.error);
    });

    lineupModeToggle?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-mode]');
      if (!button) return;
      const newMode = button.dataset.mode;
      if (newMode === state.lineupMode) return;
      state.lineupMode = newMode;
      lineupModeToggle.querySelectorAll('button').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.mode === newMode);
      });
      renderLineupChart(state.teams, state.lineupMode);
    });

    leadersToggle?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-position]');
      if (!button) return;
      const position = button.dataset.position;
      if (position === state.leaderPosition) return;
      state.leaderPosition = position;
      leadersToggle.querySelectorAll('button').forEach((btn) => {
        const isActive = btn.dataset.position === position;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });
      renderLeadersTable();
    });

    openRostersButton?.addEventListener('click', () => {
      const username = usernameInput.value.trim();
      if (!username) return;
      if (!state.currentLeagueId) return;
      const url = `../rosters/rosters.html?username=${encodeURIComponent(username)}&leagueId=${state.currentLeagueId}`;
      window.location.href = url;
    });

    if (initialUsername) {
      handleFetchData().catch(console.error);
    }

    async function handleFetchData() {
      const username = usernameInput.value.trim();
      if (!username) {
        alert('Please enter a Sleeper username.');
        return;
      }

      setLoading(true);
      infographicContent.classList.add('hidden');
      summaryStats.innerHTML = '';

      try {
        await Promise.all([
          fetchSleeperPlayers(),
          fetchKtcData()
        ]);

        await fetchUserAndLeagues(username);

        if (state.leagues.length === 0) {
          alert('No active leagues found for this user in the current season.');
          return;
        }

        let targetLeagueId = initialLeague;
        if (targetLeagueId && !state.leagues.some((league) => league.league_id === targetLeagueId)) {
          targetLeagueId = '';
        }

        const leagueId = targetLeagueId || state.leagues[0].league_id;
        leagueSelect.value = leagueId;
        await analyzeLeague(leagueId);
      } catch (error) {
        console.error(error);
        alert(error.message || 'Unable to load league data.');
      } finally {
        setLoading(false);
      }
    }

    function setLoading(isLoading) {
      loadingIndicator.classList.toggle('hidden', !isLoading);
    }

    async function fetchWithCache(url) {
      if (state.cache.has(url)) {
        return state.cache.get(url);
      }
      const response = await fetch(url, { headers: { 'User-Agent': 'DynastyHub League Analyzer' } });
      if (!response.ok) {
        throw new Error(`Sleeper request failed (${response.status})`);
      }
      const data = await response.json();
      state.cache.set(url, data);
      return data;
    }

    async function fetchSleeperPlayers() {
      if (Object.keys(state.players).length > 0) return;
      const data = await fetchWithCache('https://api.sleeper.app/v1/players/nfl');
      state.players = data;
    }

    async function fetchKtcData() {
      if (Object.keys(state.ktcOneQb).length > 0) return;
      const [oneQbCsv, sflxCsv] = await Promise.all([
        fetch(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=KTC_1QB`).then((res) => res.text()),
        fetch(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=KTC_SFLX`).then((res) => res.text())
      ]);
      state.ktcOneQb = parseKtcSheet(oneQbCsv);
      state.ktcSflx = parseKtcSheet(sflxCsv);
    }

    function parseKtcSheet(csvText) {
      const lines = csvText.split(/\r?\n/).filter(Boolean);
      const dataMap = {};
      if (lines.length === 0) return dataMap;
      const headers = parseCsvLine(lines[0]);
      const headerIndex = new Map(headers.map((header, idx) => [normalizeHeader(header), idx]));

      function get(columns, headerNames) {
        const keys = Array.isArray(headerNames) ? headerNames : [headerNames];
        for (const key of keys) {
          const idx = headerIndex.get(normalizeHeader(key));
          if (idx !== undefined) {
            const value = columns[idx];
            if (value !== undefined) return value.trim();
          }
        }
        return '';
      }

      for (let i = 1; i < lines.length; i += 1) {
        const columns = parseCsvLine(lines[i]);
        if (columns.length === 0) continue;
        const pos = get(columns, 'POS');
        const sleeperId = get(columns, 'SLPR_ID');
        const ktcValue = parseInt(get(columns, ['VALUE', 'KTC']), 10);
        if (pos === 'RDP') {
          const pickName = get(columns, 'PLAYER NAME');
          if (pickName) {
            dataMap[pickName] = { ktc: Number.isNaN(ktcValue) ? 0 : ktcValue };
          }
          continue;
        }
        if (!sleeperId || sleeperId === 'NA') continue;
        dataMap[sleeperId] = { ktc: Number.isNaN(ktcValue) ? 0 : ktcValue };
      }
      return dataMap;
    }

    function parseCsvLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (inQuotes) {
          if (char === '"') {
            if (line[i + 1] === '"') {
              current += '"';
              i += 1;
            } else {
              inQuotes = false;
            }
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
    }

    function normalizeHeader(value) {
      return value.replace(/[\u00a0\u202f]/g, ' ').trim().toUpperCase();
    }

    async function fetchUserAndLeagues(username) {
      const user = await fetchWithCache(`https://api.sleeper.app/v1/user/${username}`);
      if (!user?.user_id) {
        throw new Error('Sleeper user not found.');
      }
      state.userId = user.user_id;
      const year = new Date().getFullYear();
      const leagues = await fetchWithCache(`https://api.sleeper.app/v1/user/${state.userId}/leagues/nfl/${year}`);
      state.leagues = Array.isArray(leagues) ? leagues.sort((a, b) => a.name.localeCompare(b.name)) : [];
      populateLeagueSelect(state.leagues);
    }

    function populateLeagueSelect(leagues) {
      leagueSelect.innerHTML = '<option>Select a league...</option>';
      leagues.forEach((league) => {
        const option = document.createElement('option');
        option.value = league.league_id;
        option.textContent = league.name;
        leagueSelect.appendChild(option);
      });
      leagueSelect.disabled = leagues.length === 0;
    }

    async function analyzeLeague(leagueId) {
      setLoading(true);
      infographicContent.classList.add('hidden');
      summaryStats.innerHTML = '';

      try {
        state.currentLeagueId = leagueId;
        const leagueInfo = state.leagues.find((league) => league.league_id === leagueId);
        if (!leagueInfo) {
          throw new Error('League metadata not found.');
        }

        const qbSlots = leagueInfo.roster_positions.filter((pos) => pos === 'QB').length;
        const superflexSlots = leagueInfo.roster_positions.filter((pos) => pos === 'SUPER_FLEX').length;
        state.isSuperflex = qbSlots > 1 || superflexSlots > 0;
        state.starterSlotPlan = buildStarterSlotPlan(leagueInfo.roster_positions);

        const [rosters, users] = await Promise.all([
          fetchWithCache(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
          fetchWithCache(`https://api.sleeper.app/v1/league/${leagueId}/users`)
        ]);

        const season = leagueInfo.season || new Date().getFullYear().toString();
        await hydratePlayerStats(rosters, season);

        const teams = buildTeams(leagueInfo, rosters, users);
        state.teams = teams;

        renderSummaryChips(teams);
        renderLineupChart(teams, state.lineupMode);
        renderTeamValueChart(teams);
        renderRadarChart(teams, leagueInfo);
        renderStandingsTable(teams);
        renderLeadersTable();

        infographicContent.classList.remove('hidden');
      } finally {
        setLoading(false);
      }
    }

    async function hydratePlayerStats(rosters, season) {
      state.playerStats = {};
      const uniqueIds = new Set();
      rosters.forEach((roster) => {
        (roster.players || []).forEach((playerId) => {
          if (playerId) uniqueIds.add(playerId);
        });
      });
      const ids = Array.from(uniqueIds);
      const chunkSize = 25;
      const promises = [];
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        promises.push(Promise.all(chunk.map((playerId) => fetchPlayerSeasonStats(playerId, season))));
      }
      const results = await Promise.all(promises);
      results.flat().forEach(({ playerId, totals }) => {
        state.playerStats[playerId] = totals;
      });
    }

    async function fetchPlayerSeasonStats(playerId, season) {
      const url = `https://api.sleeper.app/v1/stats/nfl/player/${playerId}?season_type=regular&season=${season}`;
      try {
        const data = await fetchWithCache(url);
        const totals = aggregatePlayerStats(data);
        return { playerId, totals };
      } catch (error) {
        console.warn('Failed to fetch stats for player', playerId, error);
        return { playerId, totals: { totalPoints: 0, gamesPlayed: 0, ppg: 0 } };
      }
    }

    function aggregatePlayerStats(rawStats) {
      if (!rawStats || typeof rawStats !== 'object') {
        return { totalPoints: 0, gamesPlayed: 0, ppg: 0 };
      }
      let totalPoints = 0;
      let gamesPlayed = 0;
      const entries = Array.isArray(rawStats)
        ? rawStats
        : Object.values(rawStats);
      entries.forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        const pts = parseFloat(entry.pts_ppr ?? entry.pts ?? entry.pts_half_ppr ?? 0);
        const played = parseFloat(entry.played ?? entry.gp ?? entry.games_played ?? 0);
        if (Number.isFinite(pts)) {
          totalPoints += pts;
        }
        if (Number.isFinite(played) && played > 0) {
          gamesPlayed += played;
        } else if (Number.isFinite(pts) && pts > 0) {
          gamesPlayed += 1;
        }
      });
      const ppg = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;
      return { totalPoints, gamesPlayed, ppg };
    }

    function buildTeams(leagueInfo, rosters, users) {
      const userMap = new Map(users.map((user) => [user.user_id, user]));
      const ktcMap = state.isSuperflex ? state.ktcSflx : state.ktcOneQb;
      const starterSlots = state.starterSlotPlan;

      return rosters.map((roster) => {
        const owner = userMap.get(roster.owner_id);
        const displayName = owner?.display_name || `Team ${roster.roster_id}`;
        const teamName = roster.metadata?.team_name?.trim() || displayName;
        const rosterPlayers = roster.players || [];
        const starters = (roster.starters || []).filter(Boolean);

        const playerEntries = rosterPlayers.map((playerId) => {
          const info = state.players[playerId];
          const stats = state.playerStats[playerId] || { totalPoints: 0, gamesPlayed: 0, ppg: 0 };
          const ktcEntry = ktcMap[playerId] || { ktc: 0 };
          const position = info?.position || 'NA';
          const name = buildPlayerName(info);
          return {
            id: playerId,
            name,
            position,
            team: info?.team ?? 'FA',
            ktc: ktcEntry.ktc || 0,
            ppg: stats.ppg || 0,
            totalPoints: stats.totalPoints || 0,
            gamesPlayed: stats.gamesPlayed || 0
          };
        });

        const starterDetails = buildStarterBreakdown(starters, playerEntries, cloneSlotPlan(starterSlots));
        const overallBreakdown = buildRosterBreakdown(playerEntries);
        const bestAssignments = assignBestLineup(playerEntries, cloneSlotPlan(starterSlots));

        const totalValue = Object.values(overallBreakdown.byPosition).reduce((sum, value) => sum + value, 0);
        const startersValue = starterDetails.totals.value;
        const startersPpg = starterDetails.totals.ppg;
        const record = buildRecord(roster.settings || {});

        return {
          roster,
          owner,
          displayName,
          teamName,
          playerEntries,
          starters,
          starterDetails,
          starterBestAssignments: bestAssignments,
          overallBreakdown,
          totalValue,
          startersValue,
          startersPpg,
          record,
          isUserTeam: roster.owner_id === state.userId
        };
      });
    }

    function buildPlayerName(info) {
      if (!info) return 'Unknown';
      if (info.full_name) return info.full_name;
      const first = info.first_name ? `${info.first_name.trim()} ` : '';
      const last = info.last_name ? info.last_name.trim() : '';
      const combined = `${first}${last}`.trim();
      return combined || info.search_full_name || 'Unknown';
    }

    function buildStarterBreakdown(starters, playerEntries, slotPlan) {
      const totals = { value: 0, ppg: 0 };
      const valueStacks = {};
      const ppgStacks = {};
      const labelMap = {};
      const workingSlots = slotPlan.map((slot) => ({ ...slot, used: false }));

      starters.forEach((playerId) => {
        const player = playerEntries.find((entry) => entry.id === playerId);
        if (!player) return;
        const slot = consumeSlotForPlayer(player, workingSlots);
        const key = slot?.displayKey || player.position || 'FLEX';
        const label = slot?.displayLabel || key;
        labelMap[key] = label;
        valueStacks[key] = (valueStacks[key] || 0) + player.ktc;
        ppgStacks[key] = (ppgStacks[key] || 0) + player.ppg;
        totals.value += player.ktc;
        totals.ppg += player.ppg;
      });

      return {
        totals,
        stacks: { value: valueStacks, ppg: ppgStacks },
        labels: labelMap
      };
    }

    function consumeSlotForPlayer(player, slots) {
      const position = player.position;
      let slot = slots.find((item) => !item.used && !item.isFlex && item.primary === position);
      if (slot) {
        slot.used = true;
        return slot;
      }

      if (position === 'QB') {
        slot = slots.find((item) => !item.used && item.isSuperFlex);
        if (slot) {
          slot.used = true;
          return slot;
        }
      }

      slot = slots.find((item) => !item.used && item.isFlex && item.eligible.includes(position));
      if (slot) {
        slot.used = true;
        return slot;
      }

      slot = slots.find((item) => !item.used && item.eligible.includes(position));
      if (slot) {
        slot.used = true;
        return slot;
      }

      return null;
    }

    function buildRosterBreakdown(players) {
      const byPosition = { QB: 0, RB: 0, WR: 0, TE: 0, PICKS: 0, OTHER: 0 };
      players.forEach((player) => {
        const pos = player.position;
        if (byPosition[pos] === undefined) {
          if (pos === 'K' || pos === 'DEF' || pos === 'DL' || pos === 'LB' || pos === 'DB') {
            byPosition.OTHER += player.ktc;
          } else {
            byPosition.OTHER += player.ktc;
          }
          return;
        }
        byPosition[pos] += player.ktc;
      });
      return { byPosition };
    }

    function buildRecord(settings) {
      const wins = Number(settings.wins || 0);
      const losses = Number(settings.losses || 0);
      const ties = Number(settings.ties || 0);
      const fpts = Number(settings.fpts || 0) + Number(settings.fpts_decimal || 0) / 100;
      const ptsAgainst = Number(settings.pts_against || 0) + Number(settings.pts_against_decimal || 0) / 100;
      const totalGames = wins + losses + ties;
      const winPct = totalGames > 0 ? (wins + ties * 0.5) / totalGames : 0;
      return { wins, losses, ties, fpts, ptsAgainst, totalGames, winPct };
    }

    function assignBestLineup(players, starterSlots) {
      const slots = starterSlots.map((slot, index) => ({ ...slot, index }));
      const available = players.slice().sort((a, b) => b.ktc - a.ktc);
      const used = new Set();
      const slotTotals = {};
      const assignments = {};

      const positionBuckets = available.reduce((acc, player) => {
        if (!acc[player.position]) acc[player.position] = [];
        acc[player.position].push(player);
        return acc;
      }, {});

      Object.values(positionBuckets).forEach((bucket) => bucket.sort((a, b) => b.ktc - a.ktc));

      slots.forEach((slot) => {
        let candidate = null;
        if (slot.type === 'SUPER_FLEX') {
          candidate = positionBuckets.QB?.find((player) => !used.has(player.id));
          if (!candidate) {
            candidate = available.find((player) => slot.eligible.includes(player.position) && !used.has(player.id));
          }
        } else if (slot.isFlex) {
          candidate = available.find((player) => slot.eligible.includes(player.position) && !used.has(player.id));
        } else {
          candidate = positionBuckets[slot.primary]?.find((player) => !used.has(player.id));
        }

        if (candidate) {
          used.add(candidate.id);
          assignments[slot.slotKey] = candidate;
          slotTotals[slot.slotKey] = candidate.ktc;
        } else {
          assignments[slot.slotKey] = null;
          slotTotals[slot.slotKey] = 0;
        }
      });

      return { assignments, slotTotals };
    }

    function renderSummaryChips(teams) {
      const userTeam = teams.find((team) => team.isUserTeam);
      if (!userTeam) {
        summaryStats.innerHTML = '';
        return;
      }
      const totalTeams = teams.length;

      const valueRank = rankTeams(teams, (team) => team.totalValue, userTeam);
      const starterRank = rankTeams(teams, (team) => team.startersValue, userTeam);
      const ppgRank = rankTeams(teams, (team) => team.startersPpg, userTeam);

      const chips = [
        {
          label: 'Roster KTC Value',
          primary: userTeam.totalValue.toLocaleString(),
          meta: `Rank ${valueRank}/${totalTeams}`
        },
        {
          label: 'Starter KTC',
          primary: userTeam.startersValue.toLocaleString(),
          meta: `Rank ${starterRank}/${totalTeams}`
        },
        {
          label: 'Starter Combined PPG',
          primary: safeRound(userTeam.startersPpg, 2),
          meta: `Rank ${ppgRank}/${totalTeams}`
        },
        {
          label: 'Total FPTS',
          primary: safeRound(userTeam.record.fpts, 2),
          meta: `${userTeam.record.wins}-${userTeam.record.losses}-${userTeam.record.ties}`
        },
        {
          label: 'Points Against',
          primary: safeRound(userTeam.record.ptsAgainst, 2),
          meta: 'Sleeper reported'
        }
      ];

      summaryStats.innerHTML = chips.map((chip) => `
        <article class="summary-chip">
          <div class="chip-label">${chip.label}</div>
          <div class="chip-primary">${chip.primary}</div>
          <div class="chip-meta">${chip.meta}</div>
        </article>
      `).join('');
    }

    function rankTeams(teams, selector, targetTeam) {
      const sorted = teams.slice().sort((a, b) => selector(b) - selector(a));
      const index = sorted.findIndex((team) => team === targetTeam);
      return index >= 0 ? index + 1 : teams.length;
    }

    function renderLineupChart(teams, mode) {
      if (!Array.isArray(teams) || teams.length === 0) return;
      const stackKeys = deriveStackKeys(state.starterSlotPlan);
      const sorted = teams.slice().sort((a, b) => {
        const metricA = mode === 'ppg' ? a.startersPpg : a.startersValue;
        const metricB = mode === 'ppg' ? b.startersPpg : b.startersValue;
        return metricB - metricA;
      });
      const labels = sorted.map((team) => truncateLabel(team.teamName));
      const datasets = stackKeys.map((stack) => ({
        label: stack.label,
        data: sorted.map((team) => (team.starterDetails.stacks[mode]?.[stack.key] || 0)),
        backgroundColor: POS_COLORS[stack.key] || 'rgba(148,156,199,0.6)',
        borderRadius: 7,
        borderSkipped: false,
        barThickness: 'flex'
      }));

      if (lineupChartInstance) {
        lineupChartInstance.destroy();
      }

      const context = document.getElementById('lineupChart').getContext('2d');
      lineupChartInstance = new Chart(context, {
        type: 'bar',
        data: { labels, datasets },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: '#EAEFFC',
                font: { family: 'Product Sans', size: 11 }
              }
            },
            tooltip: {
              callbacks: {
                label(context) {
                  const value = context.parsed.x || 0;
                  const suffix = mode === 'ppg' ? ' PPG' : ' KTC';
                  return `${context.dataset.label}: ${mode === 'ppg' ? safeRound(value, 2) : Math.round(value)}${suffix}`;
                }
              }
            }
          },
          scales: {
            x: {
              stacked: true,
              ticks: {
                color: '#C8CEEF'
              },
              grid: { color: 'rgba(118,109,255,0.15)' },
              title: {
                display: true,
                text: mode === 'ppg' ? 'Combined Starter PPG' : 'Starter KTC Value',
                color: '#C8CEEF',
                font: { family: 'Product Sans', size: 12 }
              }
            },
            y: {
              stacked: true,
              ticks: { color: '#C8CEEF' },
              grid: { display: false }
            }
          }
        }
      });
    }

    function deriveStackKeys(slotPlan) {
      const order = [];
      const seen = new Set();
      slotPlan.forEach((slot) => {
        if (seen.has(slot.displayKey)) return;
        seen.add(slot.displayKey);
        order.push({ key: slot.displayKey, label: slot.displayLabel });
      });
      return order;
    }

    function truncateLabel(label, max = 14) {
      if (!label) return '';
      return label.length > max ? `${label.slice(0, max - 1)}…` : label;
    }

    function renderTeamValueChart(teams) {
      if (!Array.isArray(teams) || teams.length === 0) return;
      const positions = ['QB', 'RB', 'WR', 'TE', 'PICKS', 'OTHER'];
      const labels = teams.map((team) => truncateLabel(team.teamName));
      const datasets = positions.map((position) => ({
        label: position,
        data: teams.map((team) => team.overallBreakdown.byPosition[position] || 0),
        backgroundColor: POS_COLORS[position] || 'rgba(148,156,199,0.6)',
        borderRadius: 6,
        borderSkipped: false
      }));

      if (teamValueChartInstance) {
        teamValueChartInstance.destroy();
      }

      const context = document.getElementById('teamValueChart').getContext('2d');
      teamValueChartInstance = new Chart(context, {
        type: 'bar',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
              ticks: { color: '#C8CEEF' },
              grid: { display: false }
            },
            y: {
              stacked: true,
              ticks: { color: '#C8CEEF' },
              grid: { color: 'rgba(118,109,255,0.15)' }
            }
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#EAEFFC', font: { family: 'Product Sans', size: 11 } }
            },
            tooltip: {
              callbacks: {
                label(context) {
                  const value = context.parsed.y || 0;
                  return `${context.dataset.label}: ${Math.round(value).toLocaleString()} KTC`;
                }
              }
            }
          }
        }
      });
    }

    function renderRadarChart(teams, leagueInfo) {
      const userTeam = teams.find((team) => team.isUserTeam);
      if (!userTeam) return;

      const slotPlan = state.starterSlotPlan;
      const slotLabels = slotPlan.map((slot) => slot.displayLabel);
      const thetaAngles = buildThetaAngles(slotLabels.length);

      const userValues = slotPlan.map((slot) => {
        const player = userTeam.starterBestAssignments.assignments[slot.slotKey];
        return player ? player.ktc : 0;
      });

      const leagueAverages = slotPlan.map((slot) => {
        const totals = teams.reduce((sum, team) => {
          const player = team.starterBestAssignments.assignments[slot.slotKey];
          return sum + (player ? player.ktc : 0);
        }, 0);
        return totals / teams.length;
      });

      const maxReference = Math.max(...userValues, ...leagueAverages, 1);
      const normalizedUserValues = normalizeSeries(userValues, maxReference);
      const normalizedLeagueValues = normalizeSeries(leagueAverages, maxReference);
      const closingTheta = [...thetaAngles, thetaAngles[0]];
      const closingUser = [...normalizedUserValues, normalizedUserValues[0]];
      const closingLeague = [...normalizedLeagueValues, normalizedLeagueValues[0]];

      const percentTexts = slotPlan.map((slot, index) => {
        const userVal = leagueAverages[index] > 0 ? (userValues[index] / leagueAverages[index]) * 100 : 0;
        const clamped = Math.max(0, userVal);
        const color = clamped >= 100 ? '#00ffaf' : '#bcd2ff';
        return `<span style="color:${color};">${Math.round(clamped)}%</span>`;
      });

      const traces = [
        ...RING_TRACES.map((ring) => ({
          type: 'scatterpolar',
          r: Array(slotLabels.length).fill(ring.value).concat([ring.value]),
          theta: closingTheta,
          mode: 'lines',
          fill: 'toself',
          opacity: 1,
          fillcolor: ring.fill,
          line: { color: ring.stroke, width: ring.width },
          hoverinfo: 'skip',
          showlegend: false
        })),
        {
          type: 'scatterpolar',
          mode: 'lines+markers',
          name: userTeam.teamName,
          r: closingUser,
          theta: closingTheta,
          line: { color: '#6700ff', width: 2 },
          marker: {
            color: closingTheta.map((_, idx) => (idx === closingTheta.length - 1 ? 'rgba(0,0,0,0)' : '#6300ff')),
            size: closingTheta.map(() => 5)
          },
          fill: 'toself',
          fillcolor: '#5300FF55',
          hoverinfo: 'skip'
        },
        {
          type: 'scatterpolar',
          mode: 'lines',
          name: 'League Average',
          r: closingLeague,
          theta: closingTheta,
          line: { color: '#4bd5d1', width: 2, dash: 'dot' },
          fill: 'toself',
          fillcolor: '#2DFFDE33',
          opacity: 0.75,
          hoverinfo: 'skip'
        },
        {
          type: 'scatterpolar',
          mode: 'text',
          theta: thetaAngles,
          r: normalizedLeagueValues.map((value) => Math.min(94, value + 14)),
          text: percentTexts,
          textposition: 'middle center',
          textfont: { size: 9, family: 'Bruno Ace' },
          hoverinfo: 'skip',
          showlegend: false
        }
      ];

      const layout = {
        ...RADAR_LAYOUT,
        polar: {
          ...RADAR_LAYOUT.polar,
          angularaxis: {
            ...RADAR_LAYOUT.polar.angularaxis,
            tickvals: thetaAngles,
            ticktext: slotLabels
          }
        },
        annotations: [
          {
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 1.14,
            text: userTeam.teamName,
            showarrow: false,
            font: { color: '#6300ff', size: 21, family: 'Orbitron' },
            xanchor: 'center',
            yanchor: 'bottom'
          }
        ]
      };

      Plotly.react('radarChart', traces, layout, { responsive: true, displayModeBar: false });
    }

    function normalizeSeries(values, maxValue) {
      if (!values.length) return values;
      const divisor = maxValue ?? Math.max(...values, 1);
      const normalized = values.map((value) => (divisor > 0 ? (value / divisor) * 96 : 0));
      return normalized;
    }

    function buildThetaAngles(length) {
      if (length === 0) return [];
      const step = 360 / length;
      return Array.from({ length }, (_, idx) => parseFloat((idx * step).toFixed(2)));
    }

    function renderStandingsTable(teams) {
      const sorted = teams.slice().sort((a, b) => {
        if (b.record.winPct !== a.record.winPct) return b.record.winPct - a.record.winPct;
        if (b.record.fpts !== a.record.fpts) return b.record.fpts - a.record.fpts;
        return a.teamName.localeCompare(b.teamName);
      });
      standingsTableBody.innerHTML = sorted.map((team) => {
        const record = `${team.record.wins}-${team.record.losses}-${team.record.ties}`;
        return `
          <tr>
            <td>${team.teamName}</td>
            <td>${record}</td>
            <td>${safeRound(team.record.fpts, 2)}</td>
            <td>${safeRound(team.record.ptsAgainst, 2)}</td>
          </tr>
        `;
      }).join('');
    }

    function renderLeadersTable() {
      const position = state.leaderPosition;
      if (!state.teams.length) {
        leadersTableBody.innerHTML = '<tr><td colspan="5">Load a league to view leaders.</td></tr>';
        return;
      }
      const playerPool = [];
      state.teams.forEach((team) => {
        team.playerEntries.forEach((player) => {
          if (player.position !== position) return;
          if (player.gamesPlayed === 0 || player.ppg === 0) return;
          playerPool.push({
            ...player,
            owner: team.teamName
          });
        });
      });
      playerPool.sort((a, b) => {
        if (b.ppg !== a.ppg) return b.ppg - a.ppg;
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return a.name.localeCompare(b.name);
      });
      const rows = playerPool.slice(0, 10).map((player, index) => {
        const nflTeam = player.team || 'FA';
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${player.name}</td>
            <td>${nflTeam}</td>
            <td>${player.owner}</td>
            <td>${safeRound(player.ppg, 2)}</td>
          </tr>
        `;
      });
      leadersTableBody.innerHTML = rows.join('') || `
        <tr>
          <td colspan="5">No players with recorded PPG for ${position}.</td>
        </tr>
      `;
    }

    function cloneSlotPlan(slotPlan) {
      return slotPlan.map((slot) => ({ ...slot }));
    }

    function buildStarterSlotPlan(rosterPositions) {
      const slots = [];
      const positionCounts = {};
      rosterPositions.forEach((position) => {
        if (!['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX'].includes(position)) return;
        positionCounts[position] = (positionCounts[position] || 0) + 1;
      });

      const pushSlots = (position, eligible, options = {}) => {
        const count = positionCounts[position] || 0;
        const { isFlex = false, primary = position, isSuperFlex = false, label } = options;
        const displayLabel = label || position.replace('_', ' ');
        for (let i = 0; i < count; i += 1) {
          slots.push({
            slotKey: `${position}${i + 1}`,
            displayKey: position,
            displayLabel,
            primary,
            eligible,
            isFlex,
            isSuperFlex
          });
        }
      };

      pushSlots('QB', ['QB']);
      pushSlots('RB', ['RB']);
      pushSlots('WR', ['WR']);
      pushSlots('TE', ['TE']);
      pushSlots('FLEX', ['RB', 'WR', 'TE'], { isFlex: true, primary: 'FLEX', label: 'FLEX' });
      pushSlots('SUPER_FLEX', ['QB', 'RB', 'WR', 'TE'], { isFlex: true, isSuperFlex: true, primary: 'SUPER_FLEX', label: 'SUPER FLEX' });

      return slots;
    }
  });
})();
