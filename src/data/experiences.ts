import { slugify } from '../utils/slugify';

export interface ExperienceItem {
  year: string;
  role: string;
  company: string;
  location: string;
  period: string;
  duration?: string;
  isCurrent?: boolean;
  progression?: string;
  highlights: string[];
  skills: string[];
}

export const experiences: ExperienceItem[] = [
      {
      year: '2024 – 2026',
      role: 'M.S. in Computer Science',
      company: 'The University of Texas at Dallas',
      location: 'Dallas, TX',
      highlights: [
        'Completed the Data Science track, with a focus on machine learning, statistical modeling, and large-scale data analysis.',
        'Designed and trained AI models, from data preparation and feature engineering through evaluation and tuning.',
        'Built distributed data pipelines with Hadoop to process and analyze large datasets.',
        'Developed database-backed applications, applying relational design, SQL optimization, and data management best practices.',
      ],
      skills: ['Python', 'Machine Learning', 'Artificial Intelligence', 'Hadoop', 'SQL', 'Database Management'],
    },
    {
      year: 'Jul 2025 – Sep 2025',
      role: 'Student Recruitment Lead',
      company: 'Toyota North America',
      location: 'Dallas, TX',
      period: 'July 2025 – September 2025',
      highlights: [
        'Led student outreach and recruitment at UT Dallas to support HackFesta 2025, aligning efforts with Toyota Motor North America\'s (TMNA) talent and innovation objectives.',
        'Strengthened TMNA\'s early-career talent pipeline by engaging high-potential graduate and undergraduate students interested in real-world data and AI challenges. ',
      ],
      skills: ['Public Speaking', 'Communication', 'Planning'],
    },
    {
      year: '2020 – 2024',
      role: 'B.S. in Computer Science',
      company: 'The University of Texas at Dallas',
      location: 'Dallas, TX',
      highlights: [
        'Built a strong foundation in software engineering through a core curriculum in C, C++, and Java.',
        'Studied data structures and algorithm design in depth, with an emphasis on efficiency, complexity analysis, and choosing the right approach for each problem.',
        'Designed relational databases and wrote SQL queries for data storage, retrieval, and reporting.',
        'Applied object-oriented design principles to build, test, and debug programs across multiple languages.',
      ],
      skills: ['C', 'C++', 'Java', 'SQL', 'Data Structures', 'Algorithm Design', 'Object-Oriented Programming'],
    },
    {
      year: 'Feb 2023 - Mar 2024',
      role: 'Event Manager',
      company: 'Mystery Cards & Games',
      location: 'Dallas, TX',
      period: 'Febuary 2023 – March 2024',
      duration: '1 yrs 3 mos',
      highlights: [
        'Led planning and execution of in-store events, managing advertising, payout models, and event structures to drive customer engagement.',
        'Partnered with the University of Texas at Dallas Alumni Department to sponsor and host the annual Tri-Wizard Tournament, strengthening community relationships. ',
        'Built event timelines, staffed shifts to ensure full coverage, and designed floor layouts to optimize the event experience.',
        'Served as the primary point of contact for vendors, players, and hosts, coordinating logistics and resolving event-day issues.',
      ],
      skills: ['Managment', 'Public Relations', 'Planning', 'Communication'],
    },
    {
      year: 'Oct 2023 – Feb 2024',
      role: 'Software Engineer',
      company: 'R&D Workshop',
      location: 'Houston, TX',
      period: 'October 2023 – February 2024',
      duration: '3 mos',
      highlights: [
        'Designed and implemented a barcode-driven inventory management system, improving inventory tracking speed by 5x.',
        'Streamlined inventory counting and retrieval by integrating handheld barcode scanning into the workflow.',
        'Built REST API integrations to download and cache local data copies, ensuring cross-system compatibility.',
      ],
      skills: ['Database', 'Rest API', 'Python', 'Pandas'],
    },
  ];

export const experienceTagSlugs = new Set<string>(
  experiences.flatMap((exp) => exp.skills.map((skill) => slugify(skill)))
);
