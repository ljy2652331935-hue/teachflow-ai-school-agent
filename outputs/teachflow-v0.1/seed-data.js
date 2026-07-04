window.TEACHFLOW_SEED = {
  workspace: {
    teacher: {
      id: "teacher-demo-001",
      display_name: "试点教师",
      role: "Teacher"
    },
    class: {
      id: "class-year-1-engineering",
      name: "工程一年级",
      student_aliases: ["S001", "S002", "S003", "S004", "S005", "S006", "S007", "S008"]
    },
    course: {
      id: "course-intro-signals",
      title: "信号导论"
    },
    topic: {
      id: "topic-fourier-transform",
      title: "傅里叶变换"
    },
    learning_objectives: [
      "学生能够用简单语言解释傅里叶变换。",
      "学生能够理解时域和频域的区别。",
      "学生能够描述复杂信号如何分解为简单波形。",
      "学生能够把傅里叶变换连接到至少一个真实应用。"
    ],
    lesson_material: "傅里叶变换可以把信号从时域表示转换成频域表示。\n在时域中，我们观察信号如何随时间变化。\n在频域中，我们观察这个信号由哪些频率成分组成。\n一个复杂信号可以分解成许多简单的正弦波和余弦波。",
    quiz_responses_csv: "student_id,answer,confidence\nS001,\"傅里叶变换就是一个波的公式\",2\nS002,\"它把时间变成频率，但我不知道为什么\",2\nS003,\"它能把声音分解成像音符一样的简单波\",4\nS004,\"我看不出这和物理有什么关系\",1\nS005,\"它把一个信号变成另一个信号\",2\nS006,\"它像把音乐拆成不同频率\",4\nS007,\"我记得方程，但不理解它是什么意思\",2\nS008,\"频域能显示信号里面有哪些频率\",5"
  },
  approval: {
    id: "approval-demo-001",
    status: "工作区草稿",
    version: 0,
    approved_by: null,
    approved_at: null
  }
};
