# Scheduling the Pipeline Monitor as a Daily Routine

The Pipeline Monitor is designed to run once per day, unattended, on **Claude Code on the web**
(the cloud execution environment). The recurring-run feature is called **Routines**.

- Routine prompt entry point: the `/pipeline-monitor` slash command (`.claude/commands/pipeline-monitor.md`),
  which reads and executes `docs/plans/pipeline-monitor-routine-v2.md`.

## One-time setup

1. Go to **https://claude.ai/code/routines** → **New routine**.
2. **Name:** `TCG Daily Pipeline Monitor`.
3. **Prompt:** paste the following (a routine cannot reference a slash command by name, but the
   command file is present once the repo is cloned, so point the prompt at it):

   ```
   Execute the prompt in .claude/commands/pipeline-monitor.md — run the full TCG Pipeline
   Monitor routine end-to-end and publish each rep's report to the dashboard. Follow the
   DATA HANDLING RULES in docs/plans/pipeline-monitor-routine-v2.md exactly. Run autonomously;
   do not stop to ask questions.
   ```

4. **Repository:** add this repo. (Routines clone the **default branch** — see "Important caveats".)
5. **Environment:** choose an environment whose **network policy allows `app.todaycapitalgroup.com`**.
   The default "Trusted" policy does **not** include custom domains, so the `curl` calls will fail
   unless the domain is allow-listed. Create/edit an environment that permits it.
6. **Trigger:** select **Schedule → Daily**, and set the time in your local timezone (it is converted
   to UTC automatically). Recommended: early morning Pacific, before the sales day starts.
7. **Create**, then use **Run now** on the routine's detail page to test it immediately.

## Important caveats

- **Default branch only.** A routine clones the repository's default branch at the start of each run.
  The `/pipeline-monitor` command and the patched routine doc must be **merged to the default branch**
  for the scheduled run to pick them up. (They currently live on the development branch.) Until merged,
  either merge first, or paste the full routine prompt directly into the routine's Prompt field.
- **Minimum frequency is 1 hour;** "Daily" runs at the same wall-clock time each day. Runs may start a
  few minutes after the scheduled time.
- **Secrets.** The routine doc currently contains the `X-Claude-API-Key` inline. For an unattended
  routine that is acceptable, but prefer storing it as an environment **secret** and referencing it,
  so the key isn't committed in plain text.
- **No permission prompts.** Routines run fully autonomously, so the prompt must not rely on
  interactive confirmation. The `/pipeline-monitor` command is written for unattended execution.
- **Publishing = dashboard only.** Saving to `pipeline_reports` makes reports viewable at
  `/pipeline-reports`. It does **not** send email today; wire up a separate delivery job if email is wanted.

## Verifying a run

After a run, confirm the reports landed:

```sql
SELECT rep_name, deal_count, high_count, total_value
FROM pipeline_reports
WHERE report_date = (NOW() AT TIME ZONE 'America/Los_Angeles')::date
ORDER BY total_value DESC;
```

Expect one row per rep (11 total), with non-zero `total_value` for every rep that has deals.
