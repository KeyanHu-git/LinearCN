const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ globalThis: {} });
for (const file of ["translations-base.js", "translations-enhanced.js", "translations-settings.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "js", file), "utf8"), context, { filename: file });
}

const effective = new Map([
  ...(context.globalThis.LinearCNBaseEntries || []),
  ...(context.globalThis.LinearCNEnhancedEntries || []),
  ...(context.globalThis.LinearCNSettingsEntries || [])
]);

const overrides = new Map();
for (const [source, target] of effective) {
  let corrected = target;
  if (/\bissues?\b/i.test(source) && !/security issues?|problem issues?|\bquestions?\b|\bproblems?\b/i.test(source)) {
    corrected = corrected.replace(/问题/g, "议题");
  }
  corrected = corrected.replace(/你(?!们)/g, "您");
  if (corrected !== target) overrides.set(source, corrected);
}

const explicit = new Map([
  ["Open", "打开"],
  [" archived the project", "归档了项目"],
  ["Open archive", "打开归档"],
  ["Assignee", "负责人"],
  ["No assignee", "无负责人"],
  ["estimate", "估算"],
  ["Estimate", "估算"],
  ["The format of GitHub/GitLab attachments on issues", "议题中 GitHub/GitLab 附件的格式"],
  ["Workspaces are shared environments where teams can work on projects, cycles and issues.", "工作区是团队协作处理项目、周期和议题的共享环境。"],
  ["Track capacity, scope, and progress as issues are added, and as the cycle progresses.", "随着议题加入和周期推进，跟踪容量、范围和进度。"],
  ["Create custom views using filters to show only the issues or projects you want to see. You can save, share, and favorite these views for easy access and faster team collaboration.", "使用筛选器创建自定义视图，仅显示您关心的议题或项目。您可以保存、共享和收藏这些视图，以便快速访问和高效协作。"],
  ["Hi there. Complete these issues to learn how to use Linear and discover ✨", "您好。完成这些议题，了解如何使用 Linear 并探索更多功能 ✨"],
  ["Create issues from any view using ", "可在任意视图中创建议题，快捷键为 "],
  ["Start building your project by creating an issue or writing documentation.", "通过创建议题或编写文档开始构建项目。"],
  ["Projects are larger units of work with a clear outcome, such as a new feature you want to ship. They can be shared across multiple teams and are comprised of issues and optional documents.", "项目是具有明确成果的较大工作单元，例如计划发布的新功能。项目可跨多个团队共享，由议题和可选文档组成。"],
  [" shortcut to quick open My Issues and to see what's on your plate next.", " 快捷键可快速打开“我的议题”并查看下一步工作。"],
  ["Estimates are a great way of communicating the complexity of each issue or to calculate whether a cycle has more room left. Below you can choose how your team estimates issue complexity.", "估算可以表达每个议题的复杂度，也能判断当前周期是否还有容量。您可以在下方选择团队使用的议题估算方式。"],
  ["Issue estimation", "议题估算"],
  ["Priorities help your team communicate and prioritize work. Linear orders issues by priority as a default setting which you can change from the display options in different views.", "优先级帮助团队沟通并安排工作顺序。Linear 默认按优先级排列议题，您可以在不同视图的显示选项中调整此设置。"],
  ["Issue prioritization order", "议题优先级排序"],
  ["How issues without priority should be ordered when priority ordering is used.", "使用优先级排序时，未设置优先级的议题应如何排列。"],
  ["Enable issue creation by email", "启用通过电子邮件创建议题"],
  ["Use a unique email address created for your team to send or forward emails to and we'll automatically create issues from them.", "将邮件发送或转发到为团队生成的专属地址，系统会自动据此创建议题。"],
  ["Disable issue history grouping", "停用议题历史记录分组"],
  ["By default, all updates to an issue from a user are grouped into one history entry when they happen within an hour. If you want every change to an issue to be recorded (e.g. for auditing purposes), enable this setting.", "默认情况下，同一用户在一小时内对议题的所有更新会合并为一条历史记录。如需记录每一次变更（例如用于审计），请启用此设置。"],
  ["Private teams and their issues are only visible to members of the team and admins. Only workspace admins and team owners can add new users to a private team. Public teams and their issues are visible to anyone in the workspace.", "私有团队及其议题仅对团队成员和管理员可见。只有工作区管理员和团队负责人可以向私有团队添加用户。公开团队及其议题对工作区所有成员可见。"],
  ["You have 9 active issues outside cycles. Do you want to move them to Backlog?", "您有 9 个不在任何周期内的活跃议题。是否将它们移至积压事项？"],
  ["Auto-add issues to current cycle", "自动将议题添加到当前周期"],
  ["To make sure all of your work is captured by cycles, Linear can automatically add issues that are started or completed to the current cycle.", "为确保所有工作都纳入周期，Linear 可以自动将已开始或已完成的议题加入当前周期。"],
  ["Started issues", "已开始的议题"],
  ["Auto-add started issues that don't belong to any cycle to the current cycle. If the current cycle is in cooldown, they will be added to the next cycle.", "自动将不属于任何周期的已开始议题加入当前周期。如果当前周期处于冷却期，则加入下一周期。"],
  ["Auto-add completed issues in no cycle or future cycles to the current cycle. If the current cycle is in cooldown, they will be added to the next cycle.", "自动将未安排周期或位于未来周期的已完成议题加入当前周期。如果当前周期处于冷却期，则加入下一周期。"],
  ["Active issues are required to belong to a cycle", "活跃议题必须归属于某个周期"],
  ["Issues are automatically assigned a cycle if they are created or moved to Active Issues.", "议题在创建或移至“活跃议题”时会被自动分配到周期。"],
  ["Backlog issues", "积压事项中的议题"],
  ["The backlog is a place for new issues and ideas that haven’t been prioritized yet.", "积压事项用于存放尚未确定优先级的新议题和想法。"],
  ["When your team is ready to work on these issues, you can move them out of the backlog by updating their status or adding them to a Cycle.", "团队准备处理这些议题时，可以更新其状态或将其加入周期，使其离开积压事项。"],
  ["Workflows define the type and order of statuses that issues go through from start to completion. Here you can customize and re-order the available workflow statuses.", "工作流定义议题从开始到完成所经历的状态类型和顺序。您可以在此自定义并重新排列可用状态。"],
  ["Use labels to help organize and filter issues in your team. Labels created in this section are specific to this team, so they can be customized to your team’s needs.", "使用标签整理和筛选团队议题。此处创建的标签仅属于当前团队，可按团队需要进行定制。"],
  ["Triage is a special inbox for managing issues created by workspace members outside of this team. New issues created by integrations or members outside this team are sent to triage first. Review, prioritize and assign these issues by sending them to the backlog, escalating them to the current cycle, merging duplicate requests, or snoozing them for later.", "分诊是用于管理团队外部工作区成员所创建议题的专用收件箱。由集成或团队外成员创建的新议题会先进入分诊，您可以将其送入积压事项、提升到当前周期、合并重复请求或暂缓处理。"],
  ["New issues created for this team by outside members are sent to the triage inbox first.", "外部成员为此团队创建的新议题会先进入分诊收件箱。"],
  ["Duplicate issue status", "重复议题的状态"],
  ["When an issue is marked as duplicate of another issue, move the issue to this status.", "当议题被标记为另一议题的重复项时，将其移至此状态。"],
  ["With Git integrations enabled, you can automate issue workflows when opening or merging a pull request.", "启用 Git 集成后，可以在打开或合并拉取请求时自动执行议题工作流。"],
  ["Auto-close stale issues", "自动关闭长期未更新的议题"],
  ["With this feature enabled, Linear will automatically close issues that haven’t been completed or canceled and have not been updated for the configured time period.", "启用后，Linear 会自动关闭在设定时间内未更新且尚未完成或取消的议题。"],
  ["Auto-close issues not updated in", "自动关闭在以下时间内未更新的议题"],
  ["Auto-archive closed issues", "自动归档已关闭的议题"],
  ["Auto-archive issues closed for", "自动归档已关闭达到以下时长的议题"],
  ["Re-order issues when moved to a new status", "议题移至新状态时重新排序"],
  ["When grouping by status, place issues first or last in the next column as status progresses. Issues moving to a previous status will always be placed at the top, unless no action is chosen. This will affect manual ordering.", "按状态分组时，议题进入后续状态后可放在下一列的顶部或底部。移回先前状态的议题始终置顶，除非选择不执行操作。此设置会影响手动排序。"],
  ["When changing status, place issues", "更改状态时，将议题放在"],
  ["Git attachment format", "Git 附件格式"],
  ["The format of GitHub/GitLab attachments", "GitHub/GitLab 附件的格式"],
  [" Quickly run meetings with the cycles sidebar. Filter issues by assignee and then ask each member to share updates and blockers. At Linear, we run 2-week cycles and follow this format at the beginning of each cycle.", " 使用周期侧栏快速开展会议。按负责人筛选议题，再请每位成员同步进展和阻塞项。Linear 使用两周周期，并在每个周期开始时采用这一形式。"],
  ["View progress and estimate completion timeframe with graphs.", "通过图表查看进度并估算完成时间范围。"],
  ["Add Milestones to organize work within your project and break it into more granular stages.", "添加里程碑来组织项目内的工作，并将其拆分为更细的阶段。"],
  ["Create initiatives to set the direction of your company. Add projects to them to track progress towards achieving company goals.", "创建倡议以设定公司方向，并向倡议添加项目来跟踪公司目标的实现进度。"],
  ["Cycle is a product management platform that turns product feedback into customer engagement. Centralise customer insights from various sources, link them to relevant product initiatives, collaborate on those, and close the loop with customers at each release", "Cycle 是一个将产品反馈转化为客户互动的产品管理平台。它汇总多来源客户洞察，将其关联到相关产品倡议，支持协作，并在每次发布时与客户形成闭环。"],
  ["Track time, estimate tasks, set up a fixed-fee or recurring budget for your projects", "跟踪时间、估算任务，并为项目设置固定费用或周期性预算"],
  ["To create labels that are common for all teams in the workspace, add them in", "要创建供工作区所有团队共用的标签，请前往"]
]);

for (const [source, target] of explicit) overrides.set(source, target);

const outputPath = path.join(root, "js", "translations-quality.js");
const header = [
  "// Generated quality overrides. Regenerate with scripts/generate-quality-overrides.cjs.",
  "// This layer standardizes Linear terminology and corrects reviewed machine translations.",
  ""
].join("\n");
fs.writeFileSync(
  outputPath,
  `${header}globalThis.LinearCNQualityEntries = ${JSON.stringify([...overrides], null, 2)};\n`,
  "utf8"
);

process.stdout.write(JSON.stringify({ outputPath, overrideCount: overrides.size }, null, 2));
