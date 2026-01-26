# Week 1: The Agentic Engineering Manager Mental Model

> *"The moment I stopped thinking of AI as a tool and started thinking of it as a team member, everything clicked."*

## The Insight

Traditional engineering management has a well-understood playbook:
- Hire skilled people
- Give them context about what to build and why
- Set quality standards
- Review their work
- Coordinate across the team
- Remove blockers

**Agentic engineering management is the same playbook, different mechanisms.**

The mental shift isn't about learning new tools — it's about recognizing that the management skills you already have apply directly. You just need to learn how to express them in a new medium.

## The Mapping

| Management Activity | With Humans | With Agents |
|---------------------|-------------|-------------|
| **Providing context** | Onboarding docs, wiki, meetings | CLAUDE.md files at various levels |
| **Setting expectations** | Job descriptions, OKRs | Agent context files with responsibilities |
| **Assigning work** | Tickets, verbal asks | Prompts, commands, orchestration |
| **Reviewing output** | Code review, 1:1s | Human-in-the-loop checkpoints |
| **Maintaining standards** | Linters, CI, team norms | Hooks, validation gates |
| **Coordinating work** | Stand-ups, planning | Agent orchestration patterns |
| **Giving feedback** | 1:1 conversations | Prompt refinement, context updates |

## The Three Layers of Context

Just as human engineers operate in context layers (company → team → individual), agents work best with layered context:

```
Personal Context (~/.claude/CLAUDE.md)
├── Who am I as a manager?
├── What are my preferences?
└── How do I like to work?

Project Context (/project/CLAUDE.md)
├── What is this project?
├── What are our conventions?
└── How do we work together?

Agent Context (/project/.claude/agents/*/CLAUDE.md)
├── What is this agent's role?
├── What are its responsibilities?
└── How should it behave?
```

**Key insight**: Context flows downward. An agent inherits all context above it. This means:
- Personal preferences apply everywhere
- Project conventions apply to all agents in that project
- Agent-specific context is additive, not replacement

## Practical Application: The Code Review Agent

To test this mental model, I built a Code Review Agent with:

1. **Clear role definition**: "You are the Code Review Agent..."
2. **Explicit responsibilities**: Quality assurance, standards enforcement, security scanning
3. **Behavioral guidelines**: Tone, prioritization, scope awareness
4. **Output format**: Structured feedback template
5. **Escalation paths**: When to involve humans

This mirrors how I'd onboard a human code reviewer:
- Here's your role
- Here's what you're responsible for
- Here's how we like reviews done here
- Here's the format we use
- Here's when to escalate

**The agent context file IS the onboarding document.**

## What I Learned

### What Worked
- Thinking in responsibilities, not features
- Writing context as if onboarding a human
- Being explicit about limitations and escalation

### What I'm Still Figuring Out
- How much context is too much? (Token limits are real)
- How to balance consistency vs. adaptability in agent behavior
- When to split one agent into multiple specialized agents

## Questions I'm Carrying Forward

1. How do I measure if an agent is "performing well"?
2. What's the equivalent of a performance review for agents?
3. How do I handle "scope creep" in agent responsibilities?

## The Executive Takeaway

> If you can manage engineers, you can manage agents. The skills transfer directly — context provision, expectation setting, quality governance, coordination. The medium changes (CLAUDE.md instead of wikis, hooks instead of CI rules), but the fundamentals don't.
>
> The managers who will thrive in an agentic world aren't those who understand AI best — they're those who understand **management** best and can translate it to new mechanisms.

---

*Week 1 of building Archon, an AI-native Developer Experience Platform.*
*Follow the journey: [GitHub](../README.md) | [LinkedIn](#)*
