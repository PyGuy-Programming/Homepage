import { readFileSync, writeFileSync } from "fs";

const data = JSON.parse(readFileSync("projects.json", "utf-8"));
const results = {};

for (const project of data.projects) {
  const repo = project.repo;
  try {
    const [repoRes, commitsRes, langRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo}`),
      fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`),
      fetch(`https://api.github.com/repos/${repo}/languages`),
    ]);

    if (!repoRes.ok) throw new Error(`repo ${repoRes.status}`);
    const d = await repoRes.json();
    const commits = await commitsRes.json();
    const langData = await langRes.json();

    let totalCommits = Array.isArray(commits) ? commits.length : 0;
    if (d.default_branch) {
      const linkRes = await fetch(
        `https://api.github.com/repos/${repo}/commits?per_page=1&sha=${d.default_branch}`
      );
      const link = linkRes.headers.get("link");
      const m = link?.match(/page=(\d+)>; rel="last"/);
      if (m) totalCommits = parseInt(m[1]);
    }

    let lastCommitDate = null;
    if (Array.isArray(commits) && commits[0]?.commit?.committer?.date) {
      lastCommitDate = commits[0].commit.committer.date;
    }

    results[repo] = {
      stars: d.stargazers_count,
      forks: d.forks_count,
      language: d.language,
      description: d.description,
      totalCommits,
      lastCommitDate,
      languages: langData,
    };

    console.log(`  ${repo}: OK`);
  } catch (e) {
    console.error(`  ${repo}: FAILED - ${e.message}`);
    results[repo] = { error: e.message };
  }
}

writeFileSync("repo-data.json", JSON.stringify(results, null, 2) + "\n");
console.log(`\nWrote repo-data.json (${data.projects.length} repos)`);
