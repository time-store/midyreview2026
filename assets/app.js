/* ============================================================
   Bilans 2026 — Digitaleurs · logique commune
   - toggle FR/EN + toggle clair/sombre (persistés en localStorage)
   - rendu des pages de bilan (hero, journal, projets)
   - construction/reconstruction des graphiques Chart.js
   ============================================================ */

/* ---- init immédiate du thème et de la langue (avant le premier paint) ---- */
(function () {
  var t = null, l = null;
  try {
    t = localStorage.getItem('bilan-theme');
    l = localStorage.getItem('bilan-lang');
  } catch (e) {}
  if (!t) t = (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.setAttribute('data-lang', l || 'fr');
})();

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function currentLang() {
  return document.documentElement.getAttribute('data-lang') || 'fr';
}

/* ---- registre de graphiques (détruits/reconstruits au changement de thème/langue) ---- */
var __charts = [];
var __chartBuilder = null;
function registerCharts(fn) {
  __chartBuilder = fn;
  rebuildCharts();
}
function rebuildCharts() {
  __charts.forEach(function (c) { try { c.destroy(); } catch (e) {} });
  __charts = [];
  if (__chartBuilder) __chartBuilder();
}
function addChart(c) { __charts.push(c); return c; }

/* ---- toggles ---- */
function setLang(l) {
  document.documentElement.setAttribute('data-lang', l);
  try { localStorage.setItem('bilan-lang', l); } catch (e) {}
  syncToggles();
  rebuildCharts();
  if (window.__refreshTicketTable) window.__refreshTicketTable();
}
function toggleTheme() {
  var cur = document.documentElement.getAttribute('data-theme');
  var next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('bilan-theme', next); } catch (e) {}
  syncToggles();
  rebuildCharts();
}
function syncToggles() {
  var l = currentLang();
  var fr = document.getElementById('btn-fr');
  var en = document.getElementById('btn-en');
  if (fr) fr.classList.toggle('active', l === 'fr');
  if (en) en.classList.toggle('active', l === 'en');
  var th = document.getElementById('btn-theme');
  if (th) th.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀' : '☾';
}

/* ---- helpers Chart.js ---- */
function chartBaseOpts() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: cssVar('--surface'),
        borderColor: cssVar('--border'),
        borderWidth: 1,
        titleColor: cssVar('--text'),
        bodyColor: cssVar('--text'),
        padding: 10
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: cssVar('--text-dim'), font: { family: "'IBM Plex Mono', monospace", size: 11 } } },
      y: { grid: { color: cssVar('--border') }, ticks: { color: cssVar('--text-dim'), font: { family: "'IBM Plex Mono', monospace", size: 11 } } }
    }
  };
}
function palette() {
  var acc = cssVar('--accent');
  return [acc, '#C67A3A', '#5A8F72', '#5B7FB8', '#B89A4C', '#8C6FA8', '#4E9FB8', '#B85C4A', '#7A8FB8', '#A87A5C', '#6FA888', '#9A9590', '#C0587E'];
}

/* ============================================================
   Rendu d'une page de bilan individuel.
   P = { heroMeta, log, projects }  + charts data:
   { monthly, projectHours, ticketsPerProject, statusCounts }
   ============================================================ */
function renderBilan(P) {
  /* hero meta */
  var hm = document.getElementById('hero-meta');
  if (hm && P.heroMeta) {
    hm.innerHTML = P.heroMeta.map(function (s) {
      return '<div class="hero-meta-item">' +
        '<span class="hero-meta-num">' + s.num + '</span>' +
        '<span class="hero-meta-label" data-fr>' + s.fr + '</span>' +
        '<span class="hero-meta-label" data-en>' + s.en + '</span>' +
        '</div>';
    }).join('');
  }

  /* journal mensuel */
  var lg = document.getElementById('log');
  if (lg && P.log) {
    lg.innerHTML = P.log.map(function (item) {
      return '<div class="log-month">' +
        '<div class="log-dot"></div>' +
        '<span class="log-month-name"><span data-fr>' + item.month + '</span><span data-en>' + item.monthEn + '</span></span>' +
        '<p class="log-month-note"><span data-fr>' + item.note.fr + '</span><span data-en>' + item.note.en + '</span></p>' +
        '<div class="proj-chips">' +
        item.projects.map(function (p) { return '<span class="proj-chip"><strong>' + p.n + '</strong> · ' + p.d + '</span>'; }).join('') +
        '</div></div>';
    }).join('');
  }

  /* projets détaillés */
  var pl = document.getElementById('proj-list');
  if (pl && P.projects) {
    pl.innerHTML = P.projects.map(function (p, i) {
      var statusHtml = function (s) {
        if (s === 'done') return '<span data-fr>FAIT</span><span data-en>DONE</span>';
        if (s === 'progress') return '<span data-fr>EN COURS</span><span data-en>IN PROGRESS</span>';
        return '<span data-fr>OUVERT</span><span data-en>OPEN</span>';
      };
      return '<details class="proj-item"' + (i < 2 ? ' open' : '') + '>' +
        '<summary>' +
        '<div class="proj-summary-left">' +
        '<span class="proj-tag">' + p.tag + '</span>' +
        '<span class="proj-name">' + p.name + '</span>' +
        (p.hours ? '<span class="proj-hours">' + p.hours + '</span>' : '') +
        '</div>' +
        '<span class="proj-period">' + p.period + '</span>' +
        '<span class="proj-toggle">+</span>' +
        '</summary>' +
        '<div class="proj-body">' +
        '<p class="proj-desc"><span data-fr>' + p.desc.fr + '</span><span data-en>' + p.desc.en + '</span></p>' +
        '<div class="proj-tasks">' +
        p.tasks.map(function (t) {
          return '<div class="task-row">' +
            '<span class="task-status ' + t.status + '">' + statusHtml(t.status) + '</span>' +
            '<span class="task-label"><span data-fr>' + t.fr + '</span><span data-en>' + t.en + '</span></span>' +
            '<span class="task-meta">' + (t.date || '') + '</span>' +
            '</div>';
        }).join('') +
        '</div></div></details>';
    }).join('');
  }

  /* table complète des tickets */
  if (P.tickets && document.getElementById('ticket-table')) renderTicketTable(P.tickets);

  /* statistiques avancées (tuiles + chips) */
  if (P.advanced) renderAdvanced(P.advanced);

  /* graphiques */
  registerCharts(function () {
    if (typeof Chart === 'undefined') return;
    var lang = currentLang();

    var elMonthly = document.getElementById('chartMonthly');
    if (elMonthly && P.monthly) {
      addChart(new Chart(elMonthly.getContext('2d'), {
        type: 'bar',
        data: {
          labels: P.monthly.map(function (m) { return lang === 'fr' ? m.m : m.mEn; }),
          datasets: [{ data: P.monthly.map(function (m) { return m.hours; }), backgroundColor: cssVar('--accent'), borderRadius: 6, maxBarThickness: 46 }]
        },
        options: chartBaseOpts()
      }));
    }

    var elProj = document.getElementById('chartProjects');
    if (elProj && P.projectHours) {
      var o = chartBaseOpts();
      delete o.scales;
      o.plugins.legend = { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 12, color: cssVar('--text-mute'), font: { size: 11 } } };
      o.cutout = '62%';
      addChart(new Chart(elProj.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: P.projectHours.map(function (p) { return p.name; }),
          datasets: [{ data: P.projectHours.map(function (p) { return p.hours; }), backgroundColor: palette(), borderColor: cssVar('--surface'), borderWidth: 3 }]
        },
        options: o
      }));
    }

    var elTick = document.getElementById('chartTickets');
    if (elTick && P.ticketsPerProject) {
      addChart(new Chart(elTick.getContext('2d'), {
        type: 'bar',
        data: {
          labels: P.ticketsPerProject.map(function (t) { return t.proj; }),
          datasets: [{ data: P.ticketsPerProject.map(function (t) { return t.n; }), backgroundColor: cssVar('--accent'), borderRadius: 6, maxBarThickness: 40 }]
        },
        options: chartBaseOpts()
      }));
    }

    var elStatus = document.getElementById('chartStatus');
    if (elStatus && P.statusCounts) {
      var so = chartBaseOpts();
      so.indexAxis = 'y';
      so.scales = {
        x: { grid: { color: cssVar('--border') }, ticks: { color: cssVar('--text-dim'), font: { family: "'IBM Plex Mono', monospace", size: 11 } } },
        y: { grid: { display: false }, ticks: { color: cssVar('--text-dim'), font: { size: 11 } } }
      };
      addChart(new Chart(elStatus.getContext('2d'), {
        type: 'bar',
        data: {
          labels: lang === 'fr' ? P.statusCounts.fr : P.statusCounts.en,
          datasets: [{ data: P.statusCounts.data, backgroundColor: [cssVar('--success'), cssVar('--accent'), '#9A9590', '#B89A4C'], borderRadius: 6, maxBarThickness: 30 }]
        },
        options: so
      }));
    }

    /* ---- statistiques avancées ---- */
    var doughnutOpts = function () {
      var o = chartBaseOpts();
      delete o.scales;
      o.plugins.legend = { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 12, color: cssVar('--text-mute'), font: { size: 11 } } };
      o.cutout = '60%';
      return o;
    };

    /* top 10 des tickets les plus lourds (temps passé, sinon estimé) */
    var elTop = document.getElementById('chartTop');
    if (elTop && P.tickets) {
      var weighted = P.tickets
        .map(function (t) { return { t: t, w: t.spent > 0 ? t.spent : t.estimated, est: t.spent === 0 }; })
        .filter(function (x) { return x.w > 0; })
        .sort(function (a, b) { return b.w - a.w; })
        .slice(0, 10);
      var to = chartBaseOpts();
      to.indexAxis = 'y';
      to.scales = {
        x: { grid: { color: cssVar('--border') }, ticks: { color: cssVar('--text-dim'), font: { family: "'IBM Plex Mono', monospace", size: 11 } } },
        y: { grid: { display: false }, ticks: { color: cssVar('--text-mute'), font: { size: 10.5 }, autoSkip: false } }
      };
      to.plugins.tooltip.callbacks = {
        label: function (ctx) {
          var x = weighted[ctx.dataIndex];
          return (x.est ? '≈' : '') + x.w + 'h — ' + x.t.project;
        }
      };
      addChart(new Chart(elTop.getContext('2d'), {
        type: 'bar',
        data: {
          labels: weighted.map(function (x) {
            var s = x.t.subject.length > 42 ? x.t.subject.slice(0, 42) + '…' : x.t.subject;
            return '#' + x.t.id + ' · ' + s + (x.est ? ' (≈)' : '');
          }),
          datasets: [{ data: weighted.map(function (x) { return x.w; }), backgroundColor: palette().slice(0, 10), borderRadius: 5, maxBarThickness: 20 }]
        },
        options: to
      }));
    }

    /* Bug vs Tâche */
    var elTracker = document.getElementById('chartTracker');
    if (elTracker && P.tickets) {
      var nBug = P.tickets.filter(function (t) { return t.tracker === 'Bug'; }).length;
      addChart(new Chart(elTracker.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: lang === 'fr' ? ['Tâches', 'Bugs'] : ['Tasks', 'Bugs'],
          datasets: [{ data: [P.tickets.length - nBug, nBug], backgroundColor: [cssVar('--accent'), cssVar('--urgent')], borderColor: cssVar('--surface'), borderWidth: 3 }]
        },
        options: doughnutOpts()
      }));
    }

    /* répartition par priorité */
    var elPrio = document.getElementById('chartPrio');
    if (elPrio && P.tickets) {
      var order = ['Immediate', 'Urgent', 'High', 'Normal', 'Low'];
      var prioColors = { Immediate: cssVar('--urgent'), Urgent: '#D97742', High: '#B89A4C', Normal: '#9A9590', Low: '#7A8FB8' };
      var counts = {};
      P.tickets.forEach(function (t) { counts[t.priority] = (counts[t.priority] || 0) + 1; });
      var prios = order.filter(function (p) { return counts[p]; });
      addChart(new Chart(elPrio.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: prios,
          datasets: [{ data: prios.map(function (p) { return counts[p]; }), backgroundColor: prios.map(function (p) { return prioColors[p]; }), borderColor: cssVar('--surface'), borderWidth: 3 }]
        },
        options: doughnutOpts()
      }));
    }

    /* estimé vs réel */
    var elEstim = document.getElementById('chartEstim');
    if (elEstim && P.advanced && P.advanced.estimation) {
      addChart(new Chart(elEstim.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: lang === 'fr' ? ['En avance', 'À l’heure', 'En retard'] : ['Ahead', 'On time', 'Late'],
          datasets: [{ data: P.advanced.estimation.data, backgroundColor: [cssVar('--success'), '#B89A4C', cssVar('--urgent')], borderColor: cssVar('--surface'), borderWidth: 3 }]
        },
        options: doughnutOpts()
      }));
    }
  });

  syncToggles();
}

/* ============================================================
   Statistiques avancées : tuiles + chips (collaborations, aléas).
   adv = { tiles:[{num, fr, en, note?, noteEn?, color?}],
           collabs:[{n, d}], incidents:[{n, d}], estimation:{data:[a,o,l]} }
   ============================================================ */
function renderAdvanced(adv) {
  var tiles = document.getElementById('adv-tiles');
  if (tiles && adv.tiles) {
    var tileColors = [cssVar('--accent'), '#5A8F72', '#B89A4C', '#7A8FB8'];
    tiles.innerHTML = adv.tiles.map(function (t, i) {
      return '<div class="stat-tile" style="--tile-c:' + (t.color || tileColors[i % tileColors.length]) + '">' +
        '<span class="stat-tile-num">' + t.num + '</span>' +
        '<span class="stat-tile-label" data-fr>' + t.fr + '</span>' +
        '<span class="stat-tile-label" data-en>' + t.en + '</span>' +
        (t.note ? '<p class="stat-tile-note"><span data-fr>' + t.note + '</span><span data-en>' + (t.noteEn || t.note) + '</span></p>' : '') +
        '</div>';
    }).join('');
  }
  var collabs = document.getElementById('adv-collabs');
  if (collabs && adv.collabs) {
    collabs.innerHTML = adv.collabs.map(function (c) {
      return '<span class="proj-chip"><strong>' + c.n + '</strong> · <span class="chip-num">' + c.d + '</span></span>';
    }).join('');
  }
  var incidents = document.getElementById('adv-incidents');
  if (incidents && adv.incidents) {
    incidents.innerHTML = adv.incidents.map(function (c) {
      return '<span class="proj-chip"><strong>' + c.n + '</strong> · <span class="chip-num">' + c.d + '</span></span>';
    }).join('');
  }
}

/* ============================================================
   Table complète des tickets Redmine (recherche + filtres).
   tickets = [{id, project, tracker, status, priority, subject, date, spent, estimated}]
   ============================================================ */
function renderTicketTable(tickets) {
  var container = document.getElementById('ticket-table');
  var search = document.getElementById('t-search');
  var selProj = document.getElementById('t-proj');
  var selStatus = document.getElementById('t-status');
  var selPrio = document.getElementById('t-prio');
  var count = document.getElementById('t-count');

  function uniques(key) {
    var seen = {};
    tickets.forEach(function (t) { seen[t[key]] = true; });
    return Object.keys(seen).sort();
  }
  function fillSelect(sel, values) {
    if (!sel) return;
    values.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = v;
      sel.appendChild(o);
    });
  }
  fillSelect(selProj, uniques('project'));
  fillSelect(selStatus, uniques('status'));
  fillSelect(selPrio, uniques('priority'));

  function statusPill(s) {
    var cls = 's-new', lbl = s;
    if (s === 'Resolved' || s === 'Closed') cls = 's-done';
    else if (s === 'In Progress' || s === 'Feedback') cls = 's-progress';
    return '<span class="pill ' + cls + '">' + lbl + '</span>';
  }
  function prioPill(p) {
    var cls = 'p-normal';
    if (p === 'Immediate' || p === 'Urgent') cls = 'p-hot';
    else if (p === 'High') cls = 'p-high';
    return '<span class="pill ' + cls + '">' + p + '</span>';
  }
  function timeCell(t) {
    if (t.spent > 0) return t.spent.toFixed(t.spent % 1 ? 2 : 0) + 'h';
    if (t.estimated > 0) return '<span class="est">≈' + t.estimated.toFixed(t.estimated % 1 ? 2 : 0) + 'h</span>';
    return '<span class="est">—</span>';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function apply() {
    var q = (search && search.value || '').toLowerCase();
    var fp = selProj && selProj.value || '';
    var fs = selStatus && selStatus.value || '';
    var fr = selPrio && selPrio.value || '';
    var rows = tickets.filter(function (t) {
      if (fp && t.project !== fp) return false;
      if (fs && t.status !== fs) return false;
      if (fr && t.priority !== fr) return false;
      if (q && (t.id + ' ' + t.subject + ' ' + t.project).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var lang = currentLang();
    if (count) count.textContent = rows.length + ' / ' + tickets.length + (lang === 'fr' ? ' tickets' : ' tickets');
    if (!rows.length) {
      container.innerHTML = '<div class="ticket-empty">' + (lang === 'fr' ? 'Aucun ticket ne correspond aux filtres.' : 'No ticket matches the filters.') + '</div>';
      return;
    }
    var head = lang === 'fr'
      ? ['#', 'Projet', 'Sujet', 'Priorité', 'Statut', 'Temps', 'Début']
      : ['#', 'Project', 'Subject', 'Priority', 'Status', 'Time', 'Start'];
    container.innerHTML =
      '<table class="ticket-table"><thead><tr>' +
      head.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      rows.map(function (t) {
        return '<tr>' +
          '<td class="t-id">' + t.id + '</td>' +
          '<td class="t-proj">' + esc(t.project) + '</td>' +
          '<td>' + esc(t.subject) + (t.tracker === 'Bug' ? ' <span class="pill p-hot">Bug</span>' : '') + '</td>' +
          '<td>' + prioPill(t.priority) + '</td>' +
          '<td>' + statusPill(t.status) + '</td>' +
          '<td class="t-time">' + timeCell(t) + '</td>' +
          '<td class="t-date">' + esc(t.date) + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  if (search) search.addEventListener('input', apply);
  [selProj, selStatus, selPrio].forEach(function (s) { if (s) s.addEventListener('change', apply); });
  window.__refreshTicketTable = apply;
  apply();
}

document.addEventListener('DOMContentLoaded', syncToggles);
