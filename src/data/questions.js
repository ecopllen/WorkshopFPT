// src/data/questions.js
// 15 situational questions for FPT University Da Nang (FUDA) students
// Categories: Communication, Creativity, Research, Leadership, Problem-solving

export const STRENGTH_CATEGORIES = {
  Communication: {
    name: 'Communication',
    labelVi: 'Giao tiếp & Kết nối',
    role: 'Presenter',
    roleVi: 'Người truyền cảm hứng & Đại diện nhóm',
    color: '#f37021', // FPT Orange
    description: 'Truyền đạt rõ ràng, kết nối mọi người, làm cầu nối nội bộ và pitch dự án thuyết phục.'
  },
  Creativity: {
    name: 'Creativity',
    labelVi: 'Sáng tạo & Đổi mới',
    role: 'Idea Generator',
    roleVi: 'Người khởi xướng ý tưởng',
    color: '#d99a00',
    description: 'Nghĩ ra hướng đi mới, tạo nét riêng khác biệt, phá vỡ khuôn mẫu thông thường.'
  },
  Research: {
    name: 'Research',
    labelVi: 'Nghiên cứu & Dữ liệu',
    role: 'Data Keeper',
    roleVi: 'Chuyên gia phân tích & Kiểm chứng',
    color: '#1e78d6',
    description: 'Tìm kiếm, đào sâu và kiểm chứng thông tin cẩn thận, lập luận dựa trên số liệu thực tế.'
  },
  Leadership: {
    name: 'Leadership',
    labelVi: 'Lãnh đạo & Điều phối',
    role: 'Team Lead',
    roleVi: 'Trưởng nhóm & Điều phối mục tiêu',
    color: '#d92f2f',
    description: 'Phân việc đúng người đúng việc, giữ tiến độ dự án, quyết đoán trước thời hạn deadline.'
  },
  'Problem-solving': {
    name: 'Problem-solving',
    labelVi: 'Giải quyết vấn đề',
    role: 'Problem Solver',
    roleVi: 'Người tháo gỡ bế tắc',
    color: '#22935a',
    description: 'Bình tĩnh khi gặp khó, tìm giải pháp thực tế, tối ưu nguồn lực và vượt qua trở ngại kỹ thuật.'
  }
};

export const QUESTIONS = [
  {
    id: 1,
    title: 'Khởi động đồ án mới',
    scenario: 'Nhóm bạn vừa nhận đề tài đồ án tốt nghiệp từ giảng viên hướng dẫn. Trong buổi họp đầu tiên, phản xạ tự nhiên nhất của bạn là gì?',
    options: [
      {
        id: 'A',
        text: 'Chủ động lên khung kế hoạch, phân chia mốc thời gian (milestones) và phân công đầu việc cho từng thành viên.',
        strength: 'Leadership'
      },
      {
        id: 'B',
        text: 'Đề xuất nhiều góc tiếp cận độc lạ, thử nghiệm ý tưởng chưa ai làm trong các khóa trước để tạo sự khác biệt.',
        strength: 'Creativity'
      },
      {
        id: 'C',
        text: 'Lập tức tìm kiếm các bài báo khoa học, case study quốc tế và số liệu thực tế về đề tài để nắm rõ dữ liệu nền tảng.',
        strength: 'Research'
      },
      {
        id: 'D',
        text: 'Tạo không khí cởi mở, lắng nghe mong muốn và sở thích của từng bạn để mọi người cảm thấy thoải mái và gắn kết.',
        strength: 'Communication'
      },
      {
        id: 'E',
        text: 'Phân tích các rủi ro kỹ thuật khả dĩ, đánh giá tính khả thi và lập phương án dự phòng nếu gặp trở ngại thực tế.',
        strength: 'Problem-solving'
      }
    ]
  },
  {
    id: 2,
    title: 'Xung đột quan điểm trong nhóm',
    scenario: 'Hai thành viên chủ chốt trong nhóm tranh cãi gay gắt về hướng phát triển sản phẩm khiến buổi họp bị đình trệ. Bạn sẽ can thiệp thế nào?',
    options: [
      {
        id: 'A',
        text: 'Lắng nghe trọn vẹn cả hai bên, diễn giải lại cảm xúc và ý kiến của họ để tìm ra tiếng nói chung hòa giải.',
        strength: 'Communication'
      },
      {
        id: 'B',
        text: 'Yêu cầu cả hai dừng tranh luận cảm tính, đưa ra bằng chứng số liệu và dữ liệu người dùng để làm cơ sở ra quyết định.',
        strength: 'Research'
      },
      {
        id: 'C',
        text: 'Tìm ra giải pháp dung hòa hoặc một phương án thứ ba thực tế, giải quyết được khúc mắc cốt lõi của cả hai.',
        strength: 'Problem-solving'
      },
      {
        id: 'D',
        text: 'Đứng ra chốt quyết định dựa trên mục tiêu tổng thể của dự án và yêu cầu cả nhóm tuân thủ để không vỡ kế hoạch.',
        strength: 'Leadership'
      },
      {
        id: 'E',
        text: 'Tổ chức một phiên brainstorming nhanh để kết hợp phần hay nhất của cả hai ý tưởng thành một hướng đi hoàn toàn mới.',
        strength: 'Creativity'
      }
    ]
  },
  {
    id: 3,
    title: 'Khi tiến độ bị trễ hạn',
    scenario: 'Chỉ còn 3 ngày nữa là đến đợt báo cáo tiến độ với hội đồng, nhưng một tính năng quan trọng vẫn chưa hoàn thành. Bạn làm gì?',
    options: [
      {
        id: 'A',
        text: 'Cắt giảm các phần rườm rà, tập trung tái cấu trúc giải pháp để tạo ra bản demo chạy được với tối thiểu lỗi.',
        strength: 'Problem-solving'
      },
      {
        id: 'B',
        text: 'Triệu tập nhóm khẩn cấp, rà soát lại khối lượng công việc, giao việc tập trung và theo sát tiến độ từng giờ.',
        strength: 'Leadership'
      },
      {
        id: 'C',
        text: 'Tìm cách trình bày và thiết kế slide thật cuốn hút, làm nổi bật những gì nhóm đã làm tốt để bù đắp điểm thiếu sót.',
        strength: 'Communication'
      },
      {
        id: 'D',
        text: 'Tìm kiếm thư viện có sẵn, giải pháp mã nguồn mở tương đương để tích hợp nhanh vào dự án thay vì tự code từ đầu.',
        strength: 'Research'
      },
      {
        id: 'E',
        text: 'Nghĩ ra một kịch bản giới thiệu (storytelling) sáng tạo biến hạn chế hiện tại thành một cơ hội mở rộng trong tương lai.',
        strength: 'Creativity'
      }
    ]
  },
  {
    id: 4,
    title: 'Chuẩn bị bài thuyết trình (Pitching)',
    scenario: 'Nhóm chuẩn bị bước vào vòng phản biện trước giảng viên và ban giám khảo. Vai trò bạn muốn đảm nhận nhất là:',
    options: [
      {
        id: 'A',
        text: 'Đại diện nhóm đứng lên thuyết trình, tương tác với ban giám khảo và giải đáp câu hỏi một cách tự tin, trôi chảy.',
        strength: 'Communication'
      },
      {
        id: 'B',
        text: 'Thiết kế slide và visual ấn tượng, tạo animation hoặc video minh họa để bài pitch không bị nhàm chán.',
        strength: 'Creativity'
      },
      {
        id: 'C',
        text: 'Chuẩn bị phần phụ lục dữ liệu, bảng so sánh đối thủ và nguồn trích dẫn học thuật để bảo vệ lập luận của nhóm.',
        strength: 'Research'
      },
      {
        id: 'D',
        text: 'Dự đoán trước các câu hỏi hóc búa của giám khảo và chuẩn bị sẵn phương án xử lý tình huống thực tế cho nhóm.',
        strength: 'Problem-solving'
      },
      {
        id: 'E',
        text: 'Phân vai cho từng người, canh chỉnh thời gian chính xác từng phút và điều phối ai trả lời câu hỏi nào.',
        strength: 'Leadership'
      }
    ]
  },
  {
    id: 5,
    title: 'Đối diện với bài toán chưa từng gặp',
    scenario: 'Dự án gặp một yêu cầu kỹ thuật hoặc nghiệp vụ hoàn toàn mới mà không thành viên nào trong nhóm từng làm qua. Bạn sẽ làm gì đầu tiên?',
    options: [
      {
        id: 'A',
        text: 'Đọc kỹ tài liệu chính thống (official docs), tìm hiểu các bài viết phân tích chuyên sâu và case study tương tự.',
        strength: 'Research'
      },
      {
        id: 'B',
        text: 'Chia nhỏ bài toán thành từng bước đơn giản, thử nghiệm giải pháp từng phần để thu hẹp phạm vi lỗi.',
        strength: 'Problem-solving'
      },
      {
        id: 'C',
        text: 'Thử nghiệm các cách làm phá cách, kết hợp công cụ hoặc công nghệ mới lạ để xem có ra kết quả bất ngờ không.',
        strength: 'Creativity'
      },
      {
        id: 'D',
        text: 'Hỏi han các anh chị khóa trên, giảng viên hướng dẫn hoặc cộng đồng mạng để xin lời khuyên và góc nhìn nhanh.',
        strength: 'Communication'
      },
      {
        id: 'E',
        text: 'Xác định mức độ ảnh hưởng của vấn đề, phân công người tìm hiểu theo thời hạn cụ thể để không làm chậm cả nhóm.',
        strength: 'Leadership'
      }
    ]
  },
  {
    id: 6,
    title: 'Tạo động lực khi nhóm đuối sức',
    scenario: 'Vào tuần thứ 8 của học kỳ, các thành viên đều quá tải và tinh thần làm việc xuống dốc. Bạn làm gì để vực dậy cả nhóm?',
    options: [
      {
        id: 'A',
        text: 'Rủ nhóm đi ăn uống, ngồi trò chuyện tâm sự để giải tỏa áp lực và nhắc nhở nhau về lý do cùng làm đồ án.',
        strength: 'Communication'
      },
      {
        id: 'B',
        text: 'Nhắc lại mục tiêu chung, ghi nhận đóng góp của từng bạn và sắp xếp lại lịch làm việc khoa học, bớt áp lực hơn.',
        strength: 'Leadership'
      },
      {
        id: 'C',
        text: 'Tổ chức một buổi đổi gió, thử một hoạt động sáng tạo hoặc đổi concept sản phẩm để lấy lại cảm hứng.',
        strength: 'Creativity'
      },
      {
        id: 'D',
        text: 'Loại bỏ những tính năng thừa thãi gây mệt mỏi, tối ưu lại quy trình làm việc để giảm khối lượng gánh nặng.',
        strength: 'Problem-solving'
      },
      {
        id: 'E',
        text: 'Tìm các câu chuyện thành công của các dự án trước hoặc phản hồi tích cực của người dùng thử để truyền thêm động lực.',
        strength: 'Research'
      }
    ]
  },
  {
    id: 7,
    title: 'Phản hồi từ người dùng / Giảng viên',
    scenario: 'Giảng viên nhận xét giải pháp của nhóm quá chung chung và chưa có điểm nhấn thực tế. Bạn phản ứng ra sao?',
    options: [
      {
        id: 'A',
        text: 'Lập khảo sát người dùng thực tế tại FUDA hoặc phỏng vấn sâu 5–10 sinh viên để thu thập dữ liệu xác thực.',
        strength: 'Research'
      },
      {
        id: 'B',
        text: 'Brainstorm một góc nhìn táo bạo hoặc tính năng độc bản mà chưa sản phẩm nào trên thị trường sở hữu.',
        strength: 'Creativity'
      },
      {
        id: 'C',
        text: 'Hẹn gặp trực tiếp giảng viên để trao đổi kỹ hơn, hiểu rõ kỳ vọng của thầy cô và làm rõ ý định của nhóm.',
        strength: 'Communication'
      },
      {
        id: 'D',
        text: 'Xác định ngay các điểm yếu cụ thể bị chê và bắt tay sửa chữa điều chỉnh từng chi tiết logic của sản phẩm.',
        strength: 'Problem-solving'
      },
      {
        id: 'E',
        text: 'Tổng hợp lại toàn bộ nhận xét, cập nhật bảng phân công nhiệm vụ mới và đặt hạn chót nộp lại bản sửa.',
        strength: 'Leadership'
      }
    ]
  },
  {
    id: 8,
    title: 'Lựa chọn công cụ cho dự án',
    scenario: 'Cần chọn một nền tảng hoặc công cụ làm việc mới cho cả nhóm (ví dụ: Notion, Figma, Trello, Git). Tiêu chí hàng đầu của bạn:',
    options: [
      {
        id: 'A',
        text: 'Công cụ có bảng quản lý tiến độ rõ ràng, gán được deadline và đo lường được hiệu suất của từng người.',
        strength: 'Leadership'
      },
      {
        id: 'B',
        text: 'Công cụ giải quyết đúng điểm nghẽn hiện tại của nhóm một cách hiệu quả, không rườm rà phức tạp.',
        strength: 'Problem-solving'
      },
      {
        id: 'C',
        text: 'Công cụ có giao diện đẹp, tự do tùy biến linh hoạt và khơi gợi cảm hứng sáng tạo khi mở lên làm việc.',
        strength: 'Creativity'
      },
      {
        id: 'D',
        text: 'Công cụ có khả năng lưu trữ thông tin có hệ thống, tìm kiếm nhanh và hỗ trợ trích xuất dữ liệu chi tiết.',
        strength: 'Research'
      },
      {
        id: 'E',
        text: 'Công cụ có tính năng tương tác theo thời gian thực (real-time chat, comment), giúp trao đổi mượt mà.',
        strength: 'Communication'
      }
    ]
  },
  {
    id: 9,
    title: 'Phân bổ ngân sách giới hạn',
    scenario: 'Workshop cấp cho nhóm bạn 1.000.000 VNĐ để triển khai một thử nghiệm giải pháp trong 1 tháng. Bạn đề xuất chi cho:',
    options: [
      {
        id: 'A',
        text: 'Tổ chức mini workshop hoặc hoạt động tương tác trực tiếp để kết nối và thu hút sinh viên tham gia trải nghiệm.',
        strength: 'Communication'
      },
      {
        id: 'B',
        text: 'Thiết kế bộ nhận diện visual bắt mắt, in ấn ấn phẩm độc lạ để tạo hiệu ứng truyền thông nổi bật.',
        strength: 'Creativity'
      },
      {
        id: 'C',
        text: 'Chạy thử nghiệm A/B testing nhỏ hoặc mua dữ liệu nghiên cứu để đo lường chính xác hành vi người dùng.',
        strength: 'Research'
      },
      {
        id: 'D',
        text: 'Tập trung tối đa chi phí vào việc xây dựng mẫu thử (prototype) chạy được để kiểm tra tính khả thi thực tế.',
        strength: 'Problem-solving'
      },
      {
        id: 'E',
        text: 'Lập bảng phân bổ dòng tiền chi tiết, có dự phòng rủi ro 10% và theo dõi chi tiêu nghiêm ngặt từng khoản.',
        strength: 'Leadership'
      }
    ]
  },
  {
    id: 10,
    title: 'Khi thành viên biến mất hoặc chậm trễ',
    scenario: 'Một thành viên trong nhóm không trả lời tin nhắn suốt 2 ngày ngay trước hạn nộp bản thảo. Bạn xử lý thế nào?',
    options: [
      {
        id: 'A',
        text: 'Gọi điện trực tiếp hoặc gặp riêng hỏi thăm lý do, xem bạn ấy có gặp vấn đề cá nhân gì để thấu hiểu và hỗ trợ.',
        strength: 'Communication'
      },
      {
        id: 'B',
        text: 'Chủ động phân chia lại phần việc của bạn đó cho những người khác hoặc tự mình gánh một phần để bảo vệ nhóm.',
        strength: 'Leadership'
      },
      {
        id: 'C',
        text: 'Tìm cách thu nhỏ phạm vi phần việc đó lại hoặc tìm giải pháp thay thế đơn giản hơn để kịp nộp.',
        strength: 'Problem-solving'
      },
      {
        id: 'D',
        text: 'Kiểm tra lại tài liệu và lịch sử commit/note xem bạn đó đã làm đến đâu để tiếp nối công việc không bị trùng lặp.',
        strength: 'Research'
      },
      {
        id: 'E',
        text: 'Nghĩ ra một cách giải quyết linh hoạt, ví dụ xin gia hạn khéo léo hoặc biến đổi bố cục bài nộp để che khuyết điểm.',
        strength: 'Creativity'
      }
    ]
  },
  {
    id: 11,
    title: 'Đánh giá thành công của một dự án',
    scenario: 'Sau khi hoàn thành đồ án, điều gì khiến bạn cảm thấy tự hào và hài lòng nhất?',
    options: [
      {
        id: 'A',
        text: 'Sản phẩm giải quyết được vấn đề thực tế đau đầu và hoạt động trơn tru, không có lỗi nghiêm trọng.',
        strength: 'Problem-solving'
      },
      {
        id: 'B',
        text: 'Cả nhóm làm việc nhịp nhàng, đúng tiến độ từ đầu đến cuối và ai cũng trưởng thành hơn sau dự án.',
        strength: 'Leadership'
      },
      {
        id: 'C',
        text: 'Dự án nhận được sự tán thưởng của khán giả, kết nối được nhiều mối quan hệ mới và truyền cảm hứng cho người nghe.',
        strength: 'Communication'
      },
      {
        id: 'D',
        text: 'Nhóm tạo ra một ý tưởng tiên phong, không ai nghĩ tới, mang dấu ấn cá nhân đậm nét.',
        strength: 'Creativity'
      },
      {
        id: 'E',
        text: 'Bài báo cáo có cơ sở dữ liệu vững chắc, số liệu thuyết phục và được các thầy cô đánh giá cao về tính học thuật.',
        strength: 'Research'
      }
    ]
  },
  {
    id: 12,
    title: 'Cách bạn học hỏi kỹ năng mới',
    scenario: 'Để phục vụ đồ án, bạn cần học một công nghệ hoặc kiến thức hoàn toàn mới trong vòng 1 tuần. Cách tiếp cận của bạn:',
    options: [
      {
        id: 'A',
        text: 'Đọc kỹ tài liệu từ nguồn gốc, tổng hợp ghi chú có cấu trúc và so sánh các bài viết đánh giá đa chiều.',
        strength: 'Research'
      },
      {
        id: 'B',
        text: 'Bắt tay làm thử một mini project ngay, gặp lỗi ở đâu thì debug và tra cứu giải pháp xử lý ở đó.',
        strength: 'Problem-solving'
      },
      {
        id: 'C',
        text: 'Tìm các video chia sẻ sinh động, trao đổi với người có kinh nghiệm để được hướng dẫn nhanh.',
        strength: 'Communication'
      },
      {
        id: 'D',
        text: 'Lập thời gian biểu học tập chi tiết, đặt mục tiêu cụ thể mỗi ngày và tự kiểm tra tiến độ học.',
        strength: 'Leadership'
      },
      {
        id: 'E',
        text: 'Thử nghiệm các cách ứng dụng công nghệ đó vào một ý tưởng thú vị khác để tạo hứng thú học tập.',
        strength: 'Creativity'
      }
    ]
  },
  {
    id: 13,
    title: 'Xây dựng thông điệp cho sản phẩm',
    scenario: 'Nhóm cần viết một câu slogan và tóm tắt dự án trong 1 câu (one-liner) cho đồ án tốt nghiệp. Bạn hướng tới:',
    options: [
      {
        id: 'A',
        text: 'Một câu chơi chữ hoặc hình ảnh độc đáo, gây tò mò và dễ nhớ ngay từ lần đầu nghe.',
        strength: 'Creativity'
      },
      {
        id: 'B',
        text: 'Một câu nói truyền tải chân thực giá trị, chạm đúng cảm xúc và nhu cầu của sinh viên.',
        strength: 'Communication'
      },
      {
        id: 'C',
        text: 'Một câu nêu bật giải pháp thực tế giải quyết dứt điểm vấn đề gì cho người dùng.',
        strength: 'Problem-solving'
      },
      {
        id: 'D',
        text: 'Một câu cô đọng có dẫn chứng số liệu chứng minh quy mô và tác động của thị trường.',
        strength: 'Research'
      },
      {
        id: 'E',
        text: 'Một câu tuyên ngôn định vị rõ ràng tầm nhìn và cam kết của đội ngũ phát triển.',
        strength: 'Leadership'
      }
    ]
  },
  {
    id: 14,
    title: 'Khi kế hoạch ban đầu không còn phù hợp',
    scenario: 'Giữa chừng dự án, nhóm phát hiện giả định ban đầu bị sai do môi trường thay đổi. Hành động tiếp theo của bạn:',
    options: [
      {
        id: 'A',
        text: 'Bình tĩnh đánh giá tình hình, tái định hình giải pháp nhanh để thích ứng với điều kiện mới mà không hoảng loạn.',
        strength: 'Problem-solving'
      },
      {
        id: 'B',
        text: 'Tổ chức phiên xoay trục (pivot) ý tưởng, tận dụng dữ liệu cũ để tạo ra một hướng phát triển sáng tạo hơn.',
        strength: 'Creativity'
      },
      {
        id: 'C',
        text: 'Nhanh chóng điều chỉnh lộ trình, phân bổ lại nguồn lực và trấn an tinh thần của các thành viên.',
        strength: 'Leadership'
      },
      {
        id: 'D',
        text: 'Thu thập thêm dữ liệu mới để hiểu tại sao giả định cũ thất bại, tránh lặp lại sai lầm trong bước tiếp theo.',
        strength: 'Research'
      },
      {
        id: 'E',
        text: 'Chủ động trao đổi thẳng thắn với mentor và giảng viên hướng dẫn để thông báo tình hình và xin định hướng.',
        strength: 'Communication'
      }
    ]
  },
  {
    id: 15,
    title: 'Vai trò tự nhiên trong một nhóm mới',
    scenario: 'Khi bước vào một nhóm gồm toàn những người bạn chưa từng quen biết, bạn thường thấy mình tự nhiên trở thành:',
    options: [
      {
        id: 'A',
        text: 'Người kết nối, bắt chuyện làm quen, giúp mọi người nhanh chóng phá vỡ khoảng cách ngại ngùng ban đầu.',
        strength: 'Communication'
      },
      {
        id: 'B',
        text: 'Người quan sát, tìm hiểu kỹ lưỡng thông tin yêu cầu của đề bài để cả nhóm không bị đi sai hướng.',
        strength: 'Research'
      },
      {
        id: 'C',
        text: 'Người khơi gợi những ý tưởng thú vị và tạo bầu không khí hào hứng cho các buổi thảo luận.',
        strength: 'Creativity'
      },
      {
        id: 'D',
        text: 'Người đứng ra mở lời điều phối, đề xuất cách chia sẻ công việc để nhóm nhanh chóng bắt tay vào làm.',
        strength: 'Leadership'
      },
      {
        id: 'E',
        text: 'Người lắng nghe các khó khăn hiện tại và nhanh chóng đề xuất những phương án tháo gỡ cụ thể.',
        strength: 'Problem-solving'
      }
    ]
  }
];

// Helper to compute scores and determine primary & secondary strengths
export function calculateStrengthResult(answers) {
  // answers: Array of { questionId, strength } or { [questionId]: strength }
  const scores = {
    Communication: 0,
    Creativity: 0,
    Research: 0,
    Leadership: 0,
    'Problem-solving': 0
  };

  const answerList = Array.isArray(answers) ? answers : Object.values(answers);

  for (const item of answerList) {
    const strength = typeof item === 'string' ? item : item?.strength;
    if (strength && scores[strength] !== undefined) {
      scores[strength] += 1;
    }
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  // Sort descending by score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  const primaryStrength = sorted[0][0];
  const secondaryStrength = sorted[1][0];

  return {
    scores,
    total,
    primaryStrength,
    secondaryStrength
  };
}
